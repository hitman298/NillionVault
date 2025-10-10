-- NillionVault Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (can integrate with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  public_key TEXT, -- For signed uploads (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credentials table (main metadata)
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  proof_hash TEXT NOT NULL UNIQUE, -- SHA256 hash of the credential data
  nillion_vault_id TEXT, -- SecretVault reference ID
  file_name TEXT,
  file_type TEXT,
  size_bytes INTEGER,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'vaulted', 'anchored', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anchors table (immutable anchor records)
CREATE TABLE IF NOT EXISTS anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  tx_hash TEXT UNIQUE NOT NULL, -- nilChain transaction hash
  block_height BIGINT,
  tx_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  node_response JSONB, -- Raw RPC response for verification
  gas_used BIGINT,
  gas_price TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'user', 'credential', 'anchor'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'anchor', 'verify'
  actor TEXT, -- User ID or system
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_proof_hash ON credentials(proof_hash);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_anchors_credential_id ON anchors(credential_id);
CREATE INDEX IF NOT EXISTS idx_anchors_tx_hash ON anchors(tx_hash);
CREATE INDEX IF NOT EXISTS idx_anchors_status ON anchors(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own credentials" ON credentials
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Public read access for anchors (for verification)
CREATE POLICY "Anchors are publicly readable" ON anchors
  FOR SELECT USING (true);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access credentials" ON credentials
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access anchors" ON anchors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit_logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_actor TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    entity_type, entity_id, action, actor, ip_address, user_agent, metadata
  ) VALUES (
    p_entity_type, p_entity_id, p_action, p_actor, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;
