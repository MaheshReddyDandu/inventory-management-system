import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconType = 
  | 'dashboard' | 'branch' | 'client' | 'department' | 'project' | 'user' | 'users' 
  | 'calendar' | 'clock' | 'location' | 'organization' | 'assignment' | 'attendance'
  | 'rules' | 'reports' | 'chart' | 'admin' | 'shield' | 'plus' | 'edit' | 'delete'
  | 'search' | 'filter' | 'refresh' | 'check' | 'warning' | 'home' | 'hierarchy'
  | 'bulk' | 'select-all' | 'deselect' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down'
  | 'settings' | 'notification' | 'profile' | 'logout' | 'password' | 'email' | 'phone'
  | 'building' | 'office' | 'team' | 'task' | 'goal' | 'target' | 'analytics' | 'insights'
  | 'trending-up' | 'trending-down' | 'pie-chart' | 'bar-chart' | 'line-chart' | 'map'
  | 'globe' | 'world' | 'network' | 'connection' | 'link' | 'chain' | 'lock' | 'unlock'
  | 'eye' | 'eye-off' | 'download' | 'upload' | 'share' | 'export' | 'import' | 'sync'
  | 'cloud' | 'database' | 'server' | 'api' | 'code' | 'bug' | 'lightbulb' | 'star'
  | 'heart' | 'thumbs-up' | 'thumbs-down' | 'flag' | 'bookmark' | 'tag' | 'label'
  | 'folder' | 'file' | 'document' | 'image' | 'video' | 'audio' | 'archive' | 'zip'
  | 'calendar-add' | 'calendar-edit' | 'calendar-delete' | 'time-add' | 'time-edit'
  | 'location-add' | 'location-edit' | 'user-add' | 'user-edit' | 'user-delete'
  | 'group-add' | 'group-edit' | 'group-delete' | 'project-add' | 'project-edit'
  | 'project-delete' | 'task-add' | 'task-edit' | 'task-delete' | 'goal-add'
  | 'goal-edit' | 'goal-delete' | 'target-add' | 'target-edit' | 'target-delete';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconColor = 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'teal' | 'orange' | 'indigo' | 'pink' | 'gray' | 'white' | 'black' | 'blue' | 'red' | 'green' | 'yellow';
export type IconAnimation = 'none' | 'bounce' | 'pulse' | 'spin' | 'animated';

@Component({
  selector: 'app-modern-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="icon icon-{{ size }} icon-{{ color }} icon-{{ animation }}"
      [class.icon-filled]="filled"
      [class.icon-animated]="animation !== 'none'"
      [attr.data-tooltip]="tooltip"
      [style.width]="customSize"
      [style.height]="customSize">
      <svg 
        [attr.viewBox]="getViewBox()" 
        [attr.fill]="fill"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        [attr.stroke-linecap]="strokeLinecap"
        [attr.stroke-linejoin]="strokeLinejoin">
        <ng-container [ngSwitch]="type">
          <!-- Dashboard Icons -->
          <g *ngSwitchCase="'dashboard'">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </g>
          
          <!-- Organization Icons -->
          <g *ngSwitchCase="'branch'">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </g>
          
          <g *ngSwitchCase="'client'">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </g>
          
          <g *ngSwitchCase="'department'">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </g>
          
          <g *ngSwitchCase="'project'">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </g>
          
          <g *ngSwitchCase="'organization'">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </g>
          
          <!-- User Icons -->
          <g *ngSwitchCase="'user'">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </g>
          
          <g *ngSwitchCase="'users'">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </g>
          
          <!-- Time Icons -->
          <g *ngSwitchCase="'calendar'">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </g>
          
          <g *ngSwitchCase="'clock'">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </g>
          
          <!-- Location Icons -->
          <g *ngSwitchCase="'location'">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </g>
          
          <!-- Assignment Icons -->
          <g *ngSwitchCase="'assignment'">
            <path d="M9 11H1l8-8 8 8h-8v8z"/>
            <path d="M9 21v-8h6v8"/>
          </g>
          
          <g *ngSwitchCase="'attendance'">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </g>
          
          <!-- Management Icons -->
          <g *ngSwitchCase="'rules'">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </g>
          
          <g *ngSwitchCase="'reports'">
            <path d="M18 20V10"/>
            <path d="M12 20V4"/>
            <path d="M6 20v-6"/>
          </g>
          
          <g *ngSwitchCase="'chart'">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </g>
          
          <!-- Admin Icons -->
          <g *ngSwitchCase="'admin'">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            <circle cx="12" cy="12" r="3"/>
          </g>
          
          <g *ngSwitchCase="'shield'">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </g>
          
          <!-- Action Icons -->
          <g *ngSwitchCase="'plus'">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </g>
          
          <g *ngSwitchCase="'edit'">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </g>
          
          <g *ngSwitchCase="'delete'">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </g>
          
          <!-- Search Icons -->
          <g *ngSwitchCase="'search'">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </g>
          
          <g *ngSwitchCase="'filter'">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
          </g>
          
          <g *ngSwitchCase="'refresh'">
            <polyline points="23,4 23,10 17,10"/>
            <polyline points="1,20 1,14 7,14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </g>
          
          <!-- Status Icons -->
          <g *ngSwitchCase="'check'">
            <polyline points="20,6 9,17 4,12"/>
          </g>
          
          <g *ngSwitchCase="'warning'">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </g>
          
          <!-- Navigation Icons -->
          <g *ngSwitchCase="'arrow-right'">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12,5 19,12 12,19"/>
          </g>
          
          <g *ngSwitchCase="'arrow-left'">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12,19 5,12 12,5"/>
          </g>
          
          <g *ngSwitchCase="'arrow-up'">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5,12 12,5 19,12"/>
          </g>
          
          <g *ngSwitchCase="'arrow-down'">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19,12 12,19 5,12"/>
          </g>
          
          <!-- Default fallback -->
          <g *ngSwitchDefault>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </g>
        </ng-container>
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    .icon {
      position: relative;
      cursor: pointer;
    }
    
    .icon[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      white-space: nowrap;
      z-index: 1000;
      margin-bottom: 0.25rem;
    }
    
    .icon[data-tooltip]:hover::before {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.8);
      margin-bottom: -0.25rem;
      z-index: 1000;
    }
  `]
})
export class ModernIconComponent implements OnInit {
  @Input() type: IconType = 'user';
  @Input() size: IconSize = 'md';
  @Input() color: IconColor = 'primary';
  @Input() animation: IconAnimation = 'none';
  @Input() filled: boolean = false;
  @Input() tooltip: string = '';
  @Input() customSize: string = '';
  @Input() fill: string = 'currentColor';
  @Input() stroke: string = 'none';
  @Input() strokeWidth: string = '2';
  @Input() strokeLinecap: string = 'round';
  @Input() strokeLinejoin: string = 'round';

  ngOnInit(): void {
    // Set default colors based on icon type
    if (this.color === 'primary') {
      this.setContextualColor();
    }
  }

  private setContextualColor(): void {
    const colorMap: Record<IconType, IconColor> = {
      // Dashboard
      'dashboard': 'indigo',
      
      // Organization
      'branch': 'purple',
      'client': 'teal',
      'department': 'blue',
      'project': 'orange',
      'organization': 'indigo',
      
      // Users
      'user': 'blue',
      'users': 'purple',
      
      // Time
      'calendar': 'green',
      'clock': 'orange',
      
      // Location
      'location': 'red',
      
      // Management
      'assignment': 'purple',
      'attendance': 'green',
      'rules': 'yellow',
      'reports': 'indigo',
      'chart': 'blue',
      
      // Admin
      'admin': 'gray',
      'shield': 'red',
      
      // Actions
      'plus': 'green',
      'edit': 'blue',
      'delete': 'red',
      'search': 'gray',
      'filter': 'purple',
      'refresh': 'blue',
      
      // Status
      'check': 'green',
      'warning': 'yellow',
      
      // Navigation
      'arrow-right': 'gray',
      'arrow-left': 'gray',
      'arrow-up': 'gray',
      'arrow-down': 'gray',
      
      // Default
      'home': 'blue',
      'hierarchy': 'purple',
      'bulk': 'orange',
      'select-all': 'green',
      'deselect': 'red',
      'settings': 'gray',
      'notification': 'red',
      'profile': 'blue',
      'logout': 'red',
      'password': 'purple',
      'email': 'blue',
      'phone': 'green',
      'building': 'gray',
      'office': 'blue',
      'team': 'purple',
      'task': 'orange',
      'goal': 'green',
      'target': 'red',
      'analytics': 'indigo',
      'insights': 'purple',
      'trending-up': 'green',
      'trending-down': 'red',
      'pie-chart': 'orange',
      'bar-chart': 'blue',
      'line-chart': 'green',
      'map': 'red',
      'globe': 'blue',
      'world': 'green',
      'network': 'purple',
      'connection': 'teal',
      'link': 'blue',
      'chain': 'gray',
      'lock': 'red',
      'unlock': 'green',
      'eye': 'blue',
      'eye-off': 'gray',
      'download': 'green',
      'upload': 'blue',
      'share': 'purple',
      'export': 'green',
      'import': 'blue',
      'sync': 'orange',
      'cloud': 'blue',
      'database': 'purple',
      'server': 'gray',
      'api': 'orange',
      'code': 'purple',
      'bug': 'red',
      'lightbulb': 'yellow',
      'star': 'yellow',
      'heart': 'red',
      'thumbs-up': 'green',
      'thumbs-down': 'red',
      'flag': 'red',
      'bookmark': 'blue',
      'tag': 'purple',
      'label': 'orange',
      'folder': 'yellow',
      'file': 'gray',
      'document': 'blue',
      'image': 'purple',
      'video': 'red',
      'audio': 'green',
      'archive': 'orange',
      'zip': 'purple',
      'calendar-add': 'green',
      'calendar-edit': 'blue',
      'calendar-delete': 'red',
      'time-add': 'green',
      'time-edit': 'blue',
      'location-add': 'green',
      'location-edit': 'blue',
      'user-add': 'green',
      'user-edit': 'blue',
      'user-delete': 'red',
      'group-add': 'green',
      'group-edit': 'blue',
      'group-delete': 'red',
      'project-add': 'green',
      'project-edit': 'blue',
      'project-delete': 'red',
      'task-add': 'green',
      'task-edit': 'blue',
      'task-delete': 'red',
      'goal-add': 'green',
      'goal-edit': 'blue',
      'goal-delete': 'red',
      'target-add': 'green',
      'target-edit': 'blue',
      'target-delete': 'red'
    };

    this.color = colorMap[this.type] || 'gray';
  }

  getViewBox(): string {
    return '0 0 24 24';
  }
} 