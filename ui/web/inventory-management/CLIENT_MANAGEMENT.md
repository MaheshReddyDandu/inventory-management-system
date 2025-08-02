# Client Management Feature

## Overview

The Client Management feature provides a comprehensive interface for managing client organizations within the inventory management system. It follows the same design patterns and functionality as the Branch Management feature, but is specifically tailored for client organizations.

## Features

### 1. Client Hierarchy Management
- **Tree View**: Hierarchical display of clients and sub-clients
- **Expand/Collapse**: Interactive tree navigation
- **Parent-Child Relationships**: Support for nested client structures
- **Level Indication**: Visual representation of hierarchy levels

### 2. Client Operations
- **Create Client**: Add new client organizations with detailed information
- **Edit Client**: Modify existing client details
- **Delete Client**: Remove clients with confirmation
- **Bulk Operations**: Select and manage multiple clients simultaneously

### 3. Client Information
- **Basic Details**: Name, code, description, address
- **Contact Information**: Contact person, email, phone
- **Status Management**: Active/Inactive status
- **Hierarchy Data**: Parent relationships, level, sort order

### 4. Search and Filtering
- **Text Search**: Search by name, code, description, or contact information
- **Status Filter**: Filter by active/inactive status
- **Parent Type Filter**: Filter by root clients, sub-clients, or all
- **Real-time Filtering**: Instant results as you type

### 5. Statistics Dashboard
- **Total Clients**: Count of all clients
- **Active Clients**: Count of active clients
- **Sub Clients**: Count of clients with parents
- **Assigned Users**: Total users assigned to clients

## Technical Implementation

### Frontend Components

#### 1. ClientsManagementComponent
- **Location**: `src/app/components/organization/clients-management.component.ts`
- **Template**: `src/app/components/organization/clients-management.component.html`
- **Styles**: `src/app/components/organization/clients-management.component.scss`

#### 2. Key Features
- **Reactive Forms**: Form validation and handling
- **Observable Pattern**: Real-time data updates
- **Debounced Search**: Performance-optimized search
- **Bulk Selection**: Multi-select functionality
- **Modal Dialogs**: Create, edit, and delete operations

### Backend Integration

#### 1. API Endpoints
The client management uses the existing organizational unit endpoints:
- `GET /api/v1/organization/units?unit_type=client` - Get all clients
- `POST /api/v1/organization/units` - Create new client
- `PUT /api/v1/organization/units/{id}` - Update client
- `DELETE /api/v1/organization/units/{id}` - Delete client

#### 2. Data Model
Clients are stored as `OrganizationalUnit` entities with:
- `unit_type = 'client'`
- `code` format: `CL001`, `CL002`, etc.
- Hierarchical structure via `parent_id`
- Contact information and metadata

### Routing

#### Route Configuration
```typescript
{
  path: 'organization/clients',
  loadComponent: () => import('./components/organization/clients-management.component')
    .then(m => m.ClientsManagementComponent),
  canActivate: [authGuard]
}
```

#### Dashboard Integration
Added to dashboard quick actions:
```typescript
{
  title: 'Clients Management',
  description: 'Manage client organizations and relationships',
  icon: 'icon-client',
  route: '/organization/clients',
  color: 'green',
  roles: ['manager', 'admin']
}
```

## Usage

### Accessing Client Management
1. Navigate to the dashboard
2. Click on "Clients Management" in the Quick Actions section
3. Or directly visit `/organization/clients`

### Creating a Client
1. Click "Add Client" button
2. Fill in the required fields:
   - **Client Name** (required)
   - **Client Code** (required, format: CL001, CL002, etc.)
   - **Parent Client** (optional)
   - **Description** (optional)
   - **Contact Information** (optional)
   - **Address** (optional)
3. Click "Create Client"

### Editing a Client
1. Click the edit icon (✏️) next to any client
2. Modify the desired fields
3. Click "Update Client"

### Deleting a Client
1. Click the delete icon (🗑️) next to any client
2. Confirm the deletion in the modal
3. Click "Delete Client"

### Bulk Operations
1. Click "Bulk Actions" to enter bulk mode
2. Select multiple clients using checkboxes
3. Use bulk actions:
   - Select All
   - Deselect All
   - Delete Selected

### Searching and Filtering
1. Use the search box to find clients by name, code, or contact info
2. Use status filter to show only active/inactive clients
3. Use parent type filter to show root clients, sub-clients, or all
4. Click "Clear Filters" to reset all filters

## Security

### Role-Based Access
- **Admin**: Full access to all operations
- **Manager**: Can create, edit, and view clients
- **User**: Read-only access (if implemented)

### Data Validation
- Client code must follow pattern: `CL\d{3,}`
- Email addresses are validated
- Phone numbers accept common formats
- Required fields are enforced

## Styling

### Design System
The client management follows the established design system:
- **Colors**: Green theme for client-related elements
- **Typography**: Consistent with other components
- **Spacing**: Standard spacing system
- **Responsive**: Mobile-friendly design

### CSS Classes
- `.clients-management` - Main container
- `.client-node` - Individual client items
- `.client-content` - Client information display
- `.status-badge` - Status indicators
- `.modal-overlay` - Modal dialogs

## Future Enhancements

### Potential Improvements
1. **Client Analytics**: Usage statistics and reports
2. **Client Portal**: Dedicated client access interface
3. **Document Management**: Attach files to clients
4. **Client History**: Audit trail of changes
5. **Import/Export**: Bulk client data operations
6. **Client Categories**: Categorize clients by type
7. **Client Notes**: Rich text notes and comments
8. **Client Relationships**: Complex relationship mapping

### Integration Opportunities
1. **Attendance Tracking**: Track attendance by client
2. **Project Management**: Link projects to clients
3. **Billing Integration**: Client billing and invoicing
4. **Communication**: Client messaging system
5. **Reporting**: Client-specific reports and analytics

## Troubleshooting

### Common Issues

#### 1. Client Not Appearing
- Check if the client is marked as active
- Verify user has appropriate permissions
- Check for any filter settings

#### 2. Cannot Create Client
- Ensure user has manager or admin role
- Check that client code follows the required format
- Verify all required fields are filled

#### 3. Search Not Working
- Clear any active filters
- Check for typos in search terms
- Ensure search includes relevant fields

#### 4. Bulk Operations Not Working
- Make sure bulk mode is enabled
- Verify clients are selected
- Check user permissions for bulk operations

### Performance Considerations
- Large client lists are paginated
- Search is debounced for performance
- Tree expansion is lazy-loaded
- Images and icons are optimized

## Support

For technical support or feature requests related to client management, please refer to the main project documentation or contact the development team. 