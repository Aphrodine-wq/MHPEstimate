# ADR 002: Supabase as Backend

**Status:** Accepted

**Date:** March 2025

## Context

ProEstimate requires:
- **Authentication** — User login with role-based access control (RBAC)
- **Database** — Relational data for users, companies, estimates, pricing
- **Vector Search** — Semantic search over pricing history (pgvector)
- **Real-time** — Live collaboration on estimates between field and office
- **Row-Level Security (RLS)** — Data isolation by company without application logic
- **File Storage** — Document uploads (PDFs, images, invoices)
- **APIs** — RESTful and GraphQL endpoints

We evaluated several backend solutions to balance:
- **Rapid development** — Less backend code to write and maintain
- **Security** — Multi-tenant isolation, RLS enforcement
- **Scalability** — Support growing user base without refactoring
- **Cost** — Affordable for early-stage startup
- **Feature Set** — Auth + DB + Vector + Realtime in one platform

## Decision

We chose **Supabase** as the backend platform. Supabase provides:

### Core Platform
- **PostgreSQL 15** — Battle-tested relational database
- **Supabase Auth** — Email/password, OAuth, JWT-based authentication
- **Row-Level Security** — Enforce data access policies at database level
- **pgvector** — Vector similarity search for pricing/content
- **Realtime** — WebSocket-based live updates for collaboration
- **Storage** — S3-compatible file storage for documents
- **Edge Functions** — Serverless functions for business logic

### Additional Benefits
- **Local Development** — `supabase start` for offline development
- **Migrations** — Version control for schema changes
- **CLI** — Full CLI for database management
- **Hosted + Self-Hosted** — Deploy on Supabase cloud or self-host

## Alternatives Considered

### Firebase/Firestore
- **Pros:** Hosted, quick setup, generous free tier, real-time
- **Cons:** No RLS, limited query capabilities, expensive at scale, vendor lock-in
- **Rejected:** Limited control over data access and querying

### Custom Express/Fastify Backend
- **Pros:** Full control, lightweight, familiar stack
- **Cons:** Need to build auth, DB, realtime, file storage, RLS from scratch
- **Rejected:** Too much engineering overhead

### AWS Amplify
- **Pros:** AWS ecosystem integration, Auto Scaling
- **Cons:** Complex configuration, higher cost, steeper learning curve
- **Rejected:** Overkill for current scale, slower development

### Hasura
- **Pros:** Instant GraphQL API over Postgres, RLS support
- **Cons:** Overhead for simple operations, less flexibility than direct Postgres
- **Rejected:** Over-engineered for our use case

### PlanetScale/MySQL
- **Pros:** Serverless MySQL, good pricing
- **Cons:** No native RLS, no vector search, no realtime
- **Rejected:** Missing critical features

## Consequences

### Positive
- **Fast Development** — Built-in auth, RLS, realtime reduce backend code
- **Security by Default** — RLS enforced at database level (not application)
- **Multi-Tenancy** — Easy company isolation with RLS policies
- **Real-time Collaboration** — WebSocket support for live features
- **Vector Search** — pgvector enables ML-based pricing suggestions
- **Development Parity** — Local development mirrors production
- **Migration Strategy** — Can migrate to self-hosted Postgres anytime

### Negative
- **Vendor Lock-in** — Supabase-specific features (Auth, Realtime, Storage)
- **Learning Curve** — PostgreSQL and RLS require database knowledge
- **Cost at Scale** — Database operations can become expensive with high volume
- **Limited Compute** — Edge Functions have constraints vs. dedicated servers
- **Support** — Community support vs. enterprise (Enterprise tier available)

## Implementation Details

### Database Schema

Key tables with RLS:
- `users` — Auth managed by Supabase, extended via public.users
- `companies` — Organization records
- `company_members` — User-company relationships with roles
- `company_settings` — Feature flags and configuration
- `estimates` — Estimation records (RLS: own company only)
- `estimate_items` — Line items within estimates
- `pricing_history` — Historical pricing for ML
- `change_orders` — Change order tracking
- `audit_log` — Compliance and audit trail

### RLS Policies Example

```sql
-- Estimates: Users can only see estimates from their company
CREATE POLICY "Users can see estimates from their company"
ON estimates FOR SELECT
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

-- Pricing: Read-only access to company's pricing history
CREATE POLICY "Users can see pricing history from their company"
ON pricing_history FOR SELECT
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));
```

### Authentication Flow

1. User signs up via Supabase Auth
2. Public.users record created (via trigger)
3. User assigned to company via company_members table
4. RLS policies control data access
5. JWT token used for API requests

### Real-time Subscription

```typescript
// Subscribe to estimate changes
supabase
  .channel('estimates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'estimates',
  }, (payload) => {
    console.log('Estimate updated:', payload);
  })
  .subscribe();
```

### Edge Functions

Handle business logic:
- Validate pricing changes
- Trigger approval workflows
- Integrate with ElevenLabs (voice AI)
- Sync with external systems

## Deployment & Operations

### Development
```bash
supabase start
supabase db push  # Apply migrations
```

### Production
- Supabase Cloud (recommended)
- Self-hosted PostgreSQL + Docker
- Database backups automated

### Monitoring
- Supabase Dashboard — Query performance, storage
- Logs — Request logs, function execution
- Metrics — Active connections, API usage

## Related ADRs

- ADR 001: Monorepo with Turbo + pnpm
- ADR 003: Shared Estimation Engine
- ADR 004: Cross-Platform Strategy

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
