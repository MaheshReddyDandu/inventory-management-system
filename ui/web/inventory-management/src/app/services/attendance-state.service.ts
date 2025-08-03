import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { OrganizationService, Attendance } from './organization.service';
import { AuthService } from './auth.service';

export interface AttendanceState {
  currentSession: Attendance | null;
  todaySessions: Attendance[] | null;
  allSessions: Attendance[]; // All loaded sessions with pagination
  isCheckedIn: boolean;
  totalHoursToday: string;
  lastUpdate: Date;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreData: boolean;
  currentPage: number;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceStateService {
  private attendanceState = new BehaviorSubject<AttendanceState>({
    currentSession: null,
    todaySessions: null,
    allSessions: [],
    isCheckedIn: false,
    totalHoursToday: '0h 0m',
    lastUpdate: new Date(),
    isLoading: false,
    isLoadingMore: false,
    hasMoreData: true,
    currentPage: 1,
    error: null
  });

  public attendanceState$ = this.attendanceState.asObservable();

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService
  ) {
    // Check if user is already logged in
    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser) {
      this.refreshAttendanceState();
      this.startAutoRefresh();
    }
    
    // Auto-refresh every 30 seconds when user is logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.refreshAttendanceState();
        this.startAutoRefresh();
      } else {
        // Reset state when user logs out
        this.updateState({
          currentSession: null,
          todaySessions: null,
          allSessions: [],
          isCheckedIn: false,
          totalHoursToday: '0h 0m',
          isLoading: false,
          isLoadingMore: false,
          hasMoreData: true,
          currentPage: 1,
          error: null,
          lastUpdate: new Date()
        });
      }
    });
  }

  private startAutoRefresh(): void {
    timer(0, 30000) // Refresh every 30 seconds
      .pipe(
        switchMap(() => this.refreshAttendanceState()),
        catchError(error => {
          console.error('Auto-refresh failed:', error);
          return [];
        })
      )
      .subscribe();
  }

  refreshAttendanceState(reset: boolean = true): Observable<Attendance[]> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return new Observable(observer => observer.next([]));
    }

    if (reset) {
      this.updateState({ 
        isLoading: true, 
        error: null, 
        allSessions: [],
        currentPage: 1,
        hasMoreData: true
      });
    }

    // Fetch records for the past 2 weeks initially (14 days)
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.organizationService.getAttendanceRecords(currentUser.id, startDate, endDate, 1, 50)
      .pipe(
        tap(sessions => {
          this.processAttendanceSessions(sessions);
        }),
        catchError(error => {
          this.updateState({ 
            isLoading: false, 
            error: 'Failed to load attendance data',
            lastUpdate: new Date()
          });
          return [];
        })
      );
  }

  private updateState(partialState: Partial<AttendanceState>): void {
    const currentState = this.attendanceState.value;
    this.attendanceState.next({ ...currentState, ...partialState });
  }

  updateAfterCheckIn(attendance: Attendance): void {
    this.refreshAttendanceState().subscribe();
  }

  updateAfterCheckOut(attendance: Attendance): void {
    this.refreshAttendanceState().subscribe();
  }

  loadMoreAttendanceData(): Observable<Attendance[]> {
    const currentUser = this.authService.getCurrentUserValue();
    const currentState = this.attendanceState.value;
    
    if (!currentUser || !currentState.hasMoreData || currentState.isLoadingMore) {
      return new Observable(observer => observer.next([]));
    }

    this.updateState({ isLoadingMore: true, error: null });

    const nextPage = currentState.currentPage + 1;
    
    // Calculate date range for the next page (going further back in time)
    const weeksBack = nextPage; // Each page goes back more weeks
    const today = new Date();
    const endDate = new Date(today.getTime() - (weeksBack - 1) * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(today.getTime() - weeksBack * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.organizationService.getAttendanceRecords(currentUser.id, startDate, endDate, 1, 50)
      .pipe(
        tap(newSessions => {
          const currentState = this.attendanceState.value;
          const allSessions = [...currentState.allSessions, ...newSessions];
          
          // Separate today's sessions from all sessions using UTC date comparison
          const todayDate = new Date();
          const todayDateString = todayDate.toISOString().split('T')[0];
          const todaySessions = allSessions.filter(s => {
            const sessionDate = new Date(s.check_in_time);
            const sessionDateString = sessionDate.toISOString().split('T')[0];
            return sessionDateString === todayDateString;
          });

          const currentSession = todaySessions.find(s => s.check_in_time && !s.check_out_time) || null;
          const isCheckedIn = !!currentSession;
          const totalHoursToday = this.calculateTotalHours(todaySessions);

          this.updateState({
            allSessions,
            todaySessions,
            currentSession,
            isCheckedIn,
            totalHoursToday,
            currentPage: nextPage,
            hasMoreData: newSessions.length === 50, // Has more if we got a full page
            isLoadingMore: false,
            lastUpdate: new Date()
          });
        }),
        catchError(error => {
          this.updateState({
            isLoadingMore: false,
            error: 'Failed to load more attendance data'
          });
          return [];
        })
      );
  }

  private processAttendanceSessions(sessions: Attendance[]): void {
    // Separate today's sessions from all sessions using UTC date comparison
    const todayDate = new Date();
    const todayDateString = todayDate.toISOString().split('T')[0];
    
    const todaySessions = sessions.filter(s => {
      // Use UTC date comparison to handle timezone correctly
      const sessionDate = new Date(s.check_in_time);
      const sessionDateString = sessionDate.toISOString().split('T')[0];
      return sessionDateString === todayDateString;
    });

    const currentSession = todaySessions.find(s => s.check_in_time && !s.check_out_time) || null;
    const isCheckedIn = !!currentSession;
    const totalHoursToday = this.calculateTotalHours(todaySessions);

    this.updateState({
      currentSession,
      todaySessions,
      allSessions: sessions, // Store all sessions from past 2 weeks
      isCheckedIn,
      totalHoursToday,
      isLoading: false,
      isLoadingMore: false,
      hasMoreData: sessions.length === 50, // Has more if we got a full page
      error: null,
      lastUpdate: new Date()
    });
  }

  private calculateTotalHours(sessions: Attendance[]): string {
    let totalMs = 0;
    for (const session of sessions) {
      if (session.check_in_time && session.check_out_time) {
        const inTime = new Date(session.check_in_time).getTime();
        const outTime = new Date(session.check_out_time).getTime();
        totalMs += outTime - inTime;
      }
    }
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getCurrentState(): AttendanceState {
    return this.attendanceState.value;
  }

  // Manual refresh method that can be called from components
  manualRefresh(): void {
    this.refreshAttendanceState().subscribe();
  }

  // Force refresh method that can be called when component loads
  forceRefresh(): void {
    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser) {
      this.refreshAttendanceState(true).subscribe();
    }
  }
}