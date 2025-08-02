import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  OrganizationService, 
  HierarchyNode,
  OrganizationalUnit 
} from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-organization-hierarchy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './organization-hierarchy.component.html',
  styleUrls: ['./organization-hierarchy.component.scss']
})
export class OrganizationHierarchyComponent implements OnInit {
  @Input() unitType: string = '';
  @Output() unitSelected = new EventEmitter<OrganizationalUnit>();
  @Output() editUnit = new EventEmitter<OrganizationalUnit>();
  @Output() deleteUnit = new EventEmitter<OrganizationalUnit>();

  hierarchyTree: HierarchyNode[] = [];
  expandedNodes = new Set<number>();
  selectedNodeId: number | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadHierarchy();
  }

  ngOnChanges(): void {
    this.loadHierarchy();
  }

  loadHierarchy(): void {
    this.isLoading = true;
    this.organizationService.getHierarchyTree(this.unitType)
      .subscribe({
        next: (tree) => {
          this.hierarchyTree = tree;
          this.isLoading = false;
          // Auto-expand first level
          this.hierarchyTree.forEach(node => this.expandedNodes.add(node.id));
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  toggleNode(nodeId: number): void {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
  }

  isExpanded(nodeId: number): boolean {
    return this.expandedNodes.has(nodeId);
  }

  selectNode(node: HierarchyNode): void {
    this.selectedNodeId = node.id;
    // Emit to parent that we want to view this unit's details
    this.organizationService.getOrganizationalUnit(node.id)
      .subscribe({
        next: (unit) => {
          this.unitSelected.emit(unit);
        },
        error: (error) => {
          console.error('Failed to load unit details:', error);
        }
      });
  }

  onEditUnit(node: HierarchyNode, event: Event): void {
    event.stopPropagation();
    this.organizationService.getOrganizationalUnit(node.id)
      .subscribe({
        next: (unit) => {
          this.editUnit.emit(unit);
        },
        error: (error) => {
          console.error('Failed to load unit for editing:', error);
        }
      });
  }

  onDeleteUnit(node: HierarchyNode, event: Event): void {
    event.stopPropagation();
    this.organizationService.getOrganizationalUnit(node.id)
      .subscribe({
        next: (unit) => {
          this.deleteUnit.emit(unit);
        },
        error: (error) => {
          console.error('Failed to load unit for deletion:', error);
        }
      });
  }

  getNodeTypeClass(unitType: string): string {
    return `node-type-${unitType}`;
  }

  getNodeIcon(unitType: string): string {
    const iconMap: { [key: string]: string } = {
      'branch': 'icon-building',
      'client': 'icon-business',
      'department': 'icon-team',
      'project': 'icon-project'
    };
    return iconMap[unitType] || 'icon-folder';
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  refresh(): void {
    this.loadHierarchy();
  }
}