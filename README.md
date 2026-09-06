# Personal CRM

Personal CRM is a simple sales CRM you run on your own computer — think of it as your own private Salesforce. It helps one person keep track of the companies and people they sell to, the deals in progress, and the conversations and follow-ups along the way.

## Features

- **Dashboard** - An at-a-glance view of how sales are going with charts, revenue data, and upcoming tasks
- **Organizations** - Companies you do business with (searchable, editable)
- **Contacts** - People you deal with (searchable by name/email, filterable by status)
- **Deals** - Potential sales in progress (with pipeline visualization)  
- **Pipeline** - Visual board showing deals across stages (New → Qualified → Proposal → Negotiation → Won → Lost)

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
npm install
```

## Running the Application

### Development Mode
Start both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:4901 (Vite dev server)
- Backend API: http://localhost:4901/api

### Production Mode
Build and start the production version:
```bash
npm run build
npm run start
```

## Architecture

The application uses a modern tech stack:

**Frontend**: React with TypeScript, Vite for development, Tailwind CSS for styling  
**Backend**: Node.js/Express serving API endpoints  
**Database**: SQLite (local file-based database)  

All data is persisted locally in `data/crm.db` and pre-loaded with sample data on first run.

## API Endpoints

The backend provides RESTful APIs for all entities:

### Organizations
- GET /api/organizations - List organizations
- GET /api/organizations/:id - Get organization by ID  
- POST /api/organizations - Create organization
- PUT /api/organizations/:id - Update organization
- DELETE /api/organizations/:id - Delete organization

### Contacts
- GET /api/contacts - List contacts
- GET /api/contacts/:id - Get contact by ID
- POST /api/contacts - Create contact  
- PUT /api/contacts/:id - Update contact
- DELETE /api/contacts/:id - Delete contact

### Deals
- GET /api/deals - List deals
- GET /api/deals/:id - Get deal by ID
- POST /api/deals - Create deal
- PUT /api/deals/:id - Update deal  
- PUT /api/deals/:id/stage - Update deal stage
- DELETE /api/deals/:id - Delete deal

### Activities
- GET /api/activities - List activities
- GET /api/activities/:id - Get activity by ID
- POST /api/activities - Create activity
- PUT /api/activities/:id - Update activity  
- PUT /api/activities/:id/done - Toggle task completion
- DELETE /api/activities/:id - Delete activity

### Dashboard
- GET /api/dashboard - Get dashboard data (charts, stats)

## Testing

To run tests:
```bash
npm test
```

The application comes with unit tests for database operations and API endpoints.

## License

MIT