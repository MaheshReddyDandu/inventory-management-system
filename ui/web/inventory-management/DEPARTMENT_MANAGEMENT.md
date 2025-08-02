# Department Management Feature

## Overview

The Department Management feature provides a comprehensive interface for managing organizational departments within the inventory management system. It follows the same design patterns and functionality as the Branch and Client Management features, but is specifically tailored for organizational departments.

## Features

### 1. Department Hierarchy Management
- **Tree View**: Hierarchical display of departments and sub-departments
- **Expand/Collapse**: Interactive tree navigation
- **Parent-Child Relationships**: Support for nested department structures
- **Level Indication**: Visual representation of hierarchy levels

### 2. Department Operations
- **Create Department**: Add new departments with detailed information
- **Edit Department**: Modify existing department details
- **Delete Department**: Remove departments with confirmation
- **Bulk Operations**: Select and manage multiple departments simultaneously

### 3. Department Information
- **Basic Details**: Name, code, description, address
- **Contact Information**: Contact person, email, phone
- **Status Management**: Active/Inactive status
- **Hierarchy Data**: Parent relationships, level, sort order

### 4. Search and Filtering
- **Text Search**: Search by name, code, description, or contact information
- **Status Filter**: Filter by active/inactive status
- **Parent Type Filter**: Filter by root departments, sub-departments, or all
- **Real-time Filtering**: Instant results as you type

### 5. Statistics Dashboard
- **Total Departments**: Count of all departments
- **Active Departments**: Count of active departments
- **Sub Departments**: Count of departments with parents
- **Assigned Users**: Total users assigned to departments

## Technical Implementation

### Frontend Components

#### 1. DepartmentsManagementComponent
- **Location**: `src/app/components/organization/departments-management.component.ts`
- **Template**: `src/app/components/organization/departments-management.component.html`
- **Styles**: `src/app/components/organization/departments-management.component.scss`

#### 2. Key Features
- **Reactive Forms**: Form validation and handling
- **Observable Pattern**: Real-time data updates
- **Debounced Search**: Performance-optimized search
- **Bulk Selection**: Multi-select functionality
- **Modal Dialogs**: Create, edit, and delete operations

### Backend Integration

#### 1. API Endpoints
The department management uses the existing organizational unit endpoints:
- `GET /api/v1/organization/units?unit_type=department` - Get all departments
- `POST /api/v1/organization/units` - Create new department
- `PUT /api/v1/organization/units/{id}` - Update department
- `DELETE /api/v1/organization/units/{id}` - Delete department

#### 2. Data Model
Departments are stored as `OrganizationalUnit` entities with:
- `unit_type = 'department'`
- `code` format: `DEPT001`, `DEPT002`, etc.
- Hierarchical structure via `parent_id`
- Contact information and metadata

### Routing

#### Route Configuration
```typescript
{
  path: 'organization/departments',
  loadComponent: () => import('./components/organization/departments-management.component')
    .then(m => m.DepartmentsManagementComponent),
  canActivate: [authGuard]
}
```

#### Dashboard Integration
Added to dashboard quick actions:
```typescript
{
  title: 'Departments Management',
  description: 'Manage organizational departments and structure',
  icon: 'icon-department',
  route: '/organization/departments',
  color: 'blue',
  roles: ['manager', 'admin']
}
```

## Usage

### Accessing Department Management
1. Navigate to the dashboard
2. Click on "Departments Management" in the Quick Actions section
3. Or directly visit `/organization/departments`

### Creating a Department
1. Click "Add Department" button
2. Fill in the required fields:
   - **Department Name** (required)
   - **Department Code** (required, format: DEPT001, DEPT002, etc.)
   - **Parent Department** (optional)
   - **Description** (optional)
   - **Contact Information** (optional)
   - **Address** (optional)
3. Click "Create Department"

### Editing a Department
1. Click the edit icon (✏️) next to any department
2. Modify the desired fields
3. Click "Update Department"

### Deleting a Department
1. Click the delete icon (🗑️) next to any department
2. Confirm the deletion in the modal
3. Click "Delete Department"

### Bulk Operations
1. Click "Bulk Actions" to enter bulk mode
2. Select multiple departments using checkboxes
3. Use bulk actions:
   - Select All
   - Deselect All
   - Delete Selected

### Searching and Filtering
1. Use the search box to find departments by name, code, or contact info
2. Use status filter to show only active/inactive departments
3. Use parent type filter to show root departments, sub-departments, or all
4. Click "Clear Filters" to reset all filters

## Security

### Role-Based Access
- **Admin**: Full access to all operations
- **Manager**: Can create, edit, and view departments
- **User**: Read-only access (if implemented)

### Data Validation
- Department code must follow pattern: `DEPT\d{3,}`
- Email addresses are validated
- Phone numbers accept common formats
- Required fields are enforced

## Styling

### Design System
The department management follows the established design system:
- **Colors**: Blue theme for department-related elements
- **Typography**: Consistent with other components
- **Spacing**: Standard spacing system
- **Responsive**: Mobile-friendly design

### CSS Classes
- `.departments-management` - Main container
- `.department-node` - Individual department items
- `.department-content` - Department information display
- `.status-badge` - Status indicators
- `.modal-overlay` - Modal dialogs

## Future Enhancements

### Potential Improvements
1. **Department Analytics**: Usage statistics and reports
2. **Department Portal**: Dedicated department access interface
3. **Document Management**: Attach files to departments
4. **Department History**: Audit trail of changes
5. **Import/Export**: Bulk department data operations
6. **Department Categories**: Categorize departments by type
7. **Department Notes**: Rich text notes and comments
8. **Department Relationships**: Complex relationship mapping

### Integration Opportunities
1. **Attendance Tracking**: Track attendance by department
2. **Project Management**: Link projects to departments
3. **Resource Allocation**: Department resource management
4. **Communication**: Department messaging system
5. **Reporting**: Department-specific reports and analytics

## Troubleshooting

### Common Issues

#### 1. Department Not Appearing
- Check if the department is marked as active
- Verify user has appropriate permissions
- Check for any filter settings

#### 2. Cannot Create Department
- Ensure user has manager or admin role
- Check that department code follows the required format
- Verify all required fields are filled

#### 3. Search Not Working
- Clear any active filters
- Check for typos in search terms
- Ensure search includes relevant fields

#### 4. Bulk Operations Not Working
- Make sure bulk mode is enabled
- Verify departments are selected
- Check user permissions for bulk operations

### Performance Considerations
- Large department lists are paginated
- Search is debounced for performance
- Tree expansion is lazy-loaded
- Images and icons are optimized

## Support

For technical support or feature requests related to department management, please refer to the main project documentation or contact the development team. 