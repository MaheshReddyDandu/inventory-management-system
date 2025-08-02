# Project Management Feature

## Overview

The Project Management feature provides a comprehensive interface for managing organizational projects within the inventory management system. It follows the same design patterns and functionality as the Branch, Client, and Department Management features, but is specifically tailored for organizational projects.

## Features

### 1. Project Hierarchy Management
- **Tree View**: Hierarchical display of projects and sub-projects
- **Expand/Collapse**: Interactive tree navigation
- **Parent-Child Relationships**: Support for nested project structures
- **Level Indication**: Visual representation of hierarchy levels

### 2. Project Operations
- **Create Project**: Add new projects with detailed information
- **Edit Project**: Modify existing project details
- **Delete Project**: Remove projects with confirmation
- **Bulk Operations**: Select and manage multiple projects simultaneously

### 3. Project Information
- **Basic Details**: Name, code, description, address
- **Contact Information**: Contact person, email, phone
- **Status Management**: Active/Inactive status
- **Hierarchy Data**: Parent relationships, level, sort order

### 4. Search and Filtering
- **Text Search**: Search by name, code, description, or contact information
- **Status Filter**: Filter by active/inactive status
- **Parent Type Filter**: Filter by root projects, sub-projects, or all
- **Real-time Filtering**: Instant results as you type

### 5. Statistics Dashboard
- **Total Projects**: Count of all projects
- **Active Projects**: Count of active projects
- **Sub Projects**: Count of projects with parents
- **Assigned Users**: Total users assigned to projects

## Technical Implementation

### Frontend Components

#### 1. ProjectsManagementComponent
- **Location**: `src/app/components/organization/projects-management.component.ts`
- **Template**: `src/app/components/organization/projects-management.component.html`
- **Styles**: `src/app/components/organization/projects-management.component.scss`

#### 2. Key Features
- **Reactive Forms**: Form validation and handling
- **Observable Pattern**: Real-time data updates
- **Debounced Search**: Performance-optimized search
- **Bulk Selection**: Multi-select functionality
- **Modal Dialogs**: Create, edit, and delete operations

### Backend Integration

#### 1. API Endpoints
The project management uses the existing organizational unit endpoints:
- `GET /api/v1/organization/units?unit_type=project` - Get all projects
- `POST /api/v1/organization/units` - Create new project
- `PUT /api/v1/organization/units/{id}` - Update project
- `DELETE /api/v1/organization/units/{id}` - Delete project

#### 2. Data Model
Projects are stored as `OrganizationalUnit` entities with:
- `unit_type = 'project'`
- `code` format: `PRJ001`, `PRJ002`, etc.
- Hierarchical structure via `parent_id`
- Contact information and metadata

### Routing

#### Route Configuration
```typescript
{
  path: 'organization/projects',
  loadComponent: () => import('./components/organization/projects-management.component')
    .then(m => m.ProjectsManagementComponent),
  canActivate: [authGuard]
}
```

#### Dashboard Integration
Added to dashboard quick actions:
```typescript
{
  title: 'Projects Management',
  description: 'Manage organizational projects and structure',
  icon: 'icon-project',
  route: '/organization/projects',
  color: 'orange',
  roles: ['manager', 'admin']
}
```

## Usage

### Accessing Project Management
1. Navigate to the dashboard
2. Click on "Projects Management" in the Quick Actions section
3. Or directly visit `/organization/projects`

### Creating a Project
1. Click "Add Project" button
2. Fill in the required fields:
   - **Project Name** (required)
   - **Project Code** (required, format: PRJ001, PRJ002, etc.)
   - **Parent Project** (optional)
   - **Description** (optional)
   - **Contact Information** (optional)
   - **Address** (optional)
3. Click "Create Project"

### Editing a Project
1. Click the edit icon (✏️) next to any project
2. Modify the desired fields
3. Click "Update Project"

### Deleting a Project
1. Click the delete icon (🗑️) next to any project
2. Confirm the deletion in the modal
3. Click "Delete Project"

### Bulk Operations
1. Click "Bulk Actions" to enter bulk mode
2. Select multiple projects using checkboxes
3. Use bulk actions:
   - Select All
   - Deselect All
   - Delete Selected

### Searching and Filtering
1. Use the search box to find projects by name, code, or contact info
2. Use status filter to show only active/inactive projects
3. Use parent type filter to show root projects, sub-projects, or all
4. Click "Clear Filters" to reset all filters

## Security

### Role-Based Access
- **Admin**: Full access to all operations
- **Manager**: Can create, edit, and view projects
- **User**: Read-only access (if implemented)

### Data Validation
- Project code must follow pattern: `PRJ\d{3,}`
- Email addresses are validated
- Phone numbers accept common formats
- Required fields are enforced

## Styling

### Design System
The project management follows the established design system:
- **Colors**: Orange theme for project-related elements
- **Typography**: Consistent with other components
- **Spacing**: Standard spacing system
- **Responsive**: Mobile-friendly design

### CSS Classes
- `.projects-management` - Main container
- `.project-node` - Individual project items
- `.project-content` - Project information display
- `.status-badge` - Status indicators
- `.modal-overlay` - Modal dialogs

## Future Enhancements

### Potential Improvements
1. **Project Analytics**: Usage statistics and reports
2. **Project Portal**: Dedicated project access interface
3. **Document Management**: Attach files to projects
4. **Project History**: Audit trail of changes
5. **Import/Export**: Bulk project data operations
6. **Project Categories**: Categorize projects by type
7. **Project Notes**: Rich text notes and comments
8. **Project Relationships**: Complex relationship mapping

### Integration Opportunities
1. **Attendance Tracking**: Track attendance by project
2. **Task Management**: Link tasks to projects
3. **Resource Allocation**: Project resource management
4. **Communication**: Project messaging system
5. **Reporting**: Project-specific reports and analytics

## Troubleshooting

### Common Issues

#### 1. Project Not Appearing
- Check if the project is marked as active
- Verify user has appropriate permissions
- Check for any filter settings

#### 2. Cannot Create Project
- Ensure user has manager or admin role
- Check that project code follows the required format
- Verify all required fields are filled

#### 3. Search Not Working
- Clear any active filters
- Check for typos in search terms
- Ensure search includes relevant fields

#### 4. Bulk Operations Not Working
- Make sure bulk mode is enabled
- Verify projects are selected
- Check user permissions for bulk operations

### Performance Considerations
- Large project lists are paginated
- Search is debounced for performance
- Tree expansion is lazy-loaded
- Images and icons are optimized

## Support

For technical support or feature requests related to project management, please refer to the main project documentation or contact the development team. 