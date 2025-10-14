# NillionVault Architecture

## System Overview

NillionVault is a secure document storage platform that leverages Nillion Network's SecretVaults for encrypted storage, Supabase for metadata management, and blockchain anchoring for immutable verification.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        U[Users] --> F[Frontend HTML/JS]
    end
    
    subgraph "Application Layer"
        F --> API[Node.js API Server]
        API --> AUTH[Authentication]
        API --> VALID[Validation]
        API --> HASH[Hash Generation]
    end
    
    subgraph "Service Layer"
        API --> NILLION[Nillion Service]
        API --> SUPABASE[Supabase Service]
        API --> QUEUE[Queue Service]
        API --> ANCHOR[Anchor Service]
    end
    
    subgraph "Storage Layer"
        NILLION --> NILDB[Nillion SecretVaults]
        SUPABASE --> POSTGRES[PostgreSQL DB]
        QUEUE --> REDIS[Redis Queue]
    end
    
    subgraph "Blockchain Layer"
        ANCHOR --> NILCHAIN[nilChain Testnet]
        NILCHAIN --> EXPLORER[Blockchain Explorer]
    end
    
    subgraph "External Services"
        NILDB --> NILAUTH[Nillion Auth]
        NILDB --> NILNODES[DB Nodes]
    end
    
    style F fill:#e1f5fe
    style API fill:#f3e5f5
    style NILLION fill:#e8f5e8
    style SUPABASE fill:#fff3e0
    style NILCHAIN fill:#fce4ec
```

## Component Details

### Frontend (HTML/JavaScript)
- **Technology**: Pure HTML5, CSS3, JavaScript ES6+
- **Port**: 3000
- **Features**: 
  - Drag & drop file upload
  - Real-time progress tracking
  - Hash verification interface
  - Recent uploads display

### Backend API (Node.js)
- **Technology**: Node.js, Express.js
- **Port**: 3001
- **Features**:
  - RESTful API endpoints
  - File upload handling
  - Hash generation and verification
  - Database operations
  - Error handling and logging

### Nillion Integration
- **SecretVaults**: Encrypted document storage
- **Authentication**: Builder registration and token management
- **Network**: Testnet with fallback to Supabase

### Database (Supabase)
- **Technology**: PostgreSQL
- **Schema**: 
  - Users table
  - Credentials table (metadata)
  - Anchors table (blockchain records)
  - Audit logs table

### Queue System (Redis)
- **Technology**: Upstash Redis
- **Purpose**: Background anchoring jobs
- **Status**: Currently disabled (mock mode)

### Blockchain (nilChain)
- **Network**: Testnet
- **Purpose**: Immutable proof anchoring
- **Features**: Transaction hashing and verification

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Server
    participant S as Supabase
    participant N as Nillion
    participant B as Blockchain
    
    U->>F: Upload JSON file
    F->>API: POST /api/credentials/upload
    API->>API: Generate proof hash
    API->>S: Store metadata
    API->>N: Store encrypted data
    N-->>API: Return vault ID
    API->>B: Anchor transaction
    B-->>API: Return tx hash
    API-->>F: Return success + hash
    F-->>U: Display upload success
    
    Note over U,B: Verification Flow
    U->>F: Enter proof hash
    F->>API: POST /api/credentials/verify
    API->>S: Query by hash
    S-->>API: Return metadata
    API-->>F: Return verification result
    F-->>U: Display verification details
```

## Security Model

### Encryption Layers
1. **Transport**: HTTPS/TLS
2. **Storage**: Nillion SecretVaults encryption
3. **Verification**: SHA-256 cryptographic hashing
4. **Blockchain**: Immutable transaction anchoring

### Access Control
- **Public**: Hash verification (read-only)
- **Authenticated**: Document upload and management
- **Admin**: System administration and monitoring

### Data Privacy
- **Encrypted Storage**: Documents stored in encrypted shares
- **Hash-only Verification**: No document content exposed
- **Audit Trail**: Complete operation logging

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Frontend Hosting"
            V[Vercel/Netlify]
        end
        
        subgraph "Backend Hosting"
            R[Render/Railway]
        end
        
        subgraph "Database"
            S[Supabase Cloud]
        end
        
        subgraph "Queue"
            U[Upstash Redis]
        end
        
        subgraph "Blockchain"
            N[Nillion Testnet]
        end
    end
    
    subgraph "Development"
        L[Local Development]
    end
    
    V --> R
    R --> S
    R --> U
    R --> N
    L -.-> V
    L -.-> R
    
    style V fill:#e1f5fe
    style R fill:#f3e5f5
    style S fill:#fff3e0
    style N fill:#e8f5e8
```

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | HTML5/CSS3/JS | User interface |
| Backend | Node.js/Express | API server |
| Database | Supabase PostgreSQL | Metadata storage |
| Storage | Nillion SecretVaults | Encrypted document storage |
| Queue | Upstash Redis | Background jobs |
| Blockchain | nilChain Testnet | Proof anchoring |
| Deployment | Vercel/Render | Cloud hosting |

## Performance Considerations

- **File Size Limit**: 10MB per document
- **Concurrent Uploads**: Limited by server capacity
- **Hash Generation**: ~100ms for typical documents
- **Database Queries**: Optimized with proper indexing
- **Blockchain Latency**: ~30 seconds for confirmation

## Scalability

- **Horizontal Scaling**: Stateless API design
- **Database Scaling**: Supabase auto-scaling
- **CDN**: Static assets via Vercel/Netlify
- **Caching**: Redis for session and queue data
