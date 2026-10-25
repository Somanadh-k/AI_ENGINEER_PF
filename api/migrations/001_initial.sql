-- SOMANADH.OS initial PostgreSQL schema
-- Generated from the SQLAlchemy models. Local development uses create_all();
-- production should apply this migration before starting the API.

BEGIN;

CREATE TABLE admin_sessions (
	token_hash VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_admin_sessions PRIMARY KEY (token_hash)
);
CREATE INDEX ix_admin_sessions_expires_at ON admin_sessions (expires_at);

CREATE TABLE ai_content_cache (
	key VARCHAR(200) NOT NULL, 
	text TEXT NOT NULL, 
	mode VARCHAR(24) NOT NULL, 
	model VARCHAR(120), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_ai_content_cache PRIMARY KEY (key)
);

CREATE TABLE ai_interactions (
	id SERIAL NOT NULL, 
	session_id VARCHAR(64), 
	visitor_id VARCHAR(64), 
	question VARCHAR(500) NOT NULL, 
	question_key VARCHAR(300) NOT NULL, 
	intent VARCHAR(32), 
	mode VARCHAR(24) NOT NULL, 
	model VARCHAR(120), 
	ok BOOLEAN NOT NULL, 
	latency_ms INTEGER NOT NULL, 
	prompt_tokens INTEGER NOT NULL, 
	completion_tokens INTEGER NOT NULL, 
	sources JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_ai_interactions PRIMARY KEY (id)
);
CREATE INDEX ix_ai_interactions_created_at ON ai_interactions (created_at);
CREATE INDEX ix_ai_interactions_question_key ON ai_interactions (question_key);
CREATE INDEX ix_ai_interactions_session_id ON ai_interactions (session_id);

CREATE TABLE analytics_events (
	id SERIAL NOT NULL, 
	session_id VARCHAR(64), 
	visitor_id VARCHAR(64), 
	event_type VARCHAR(40) NOT NULL, 
	path VARCHAR(300), 
	project_slug VARCHAR(120), 
	country VARCHAR(2), 
	device VARCHAR(24), 
	browser VARCHAR(32), 
	referrer_host VARCHAR(160), 
	source VARCHAR(48), 
	meta JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_analytics_events PRIMARY KEY (id)
);
CREATE INDEX ix_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX ix_analytics_events_event_type ON analytics_events (event_type);
CREATE INDEX ix_analytics_events_project_slug ON analytics_events (project_slug);
CREATE INDEX ix_analytics_events_session_id ON analytics_events (session_id);
CREATE INDEX ix_analytics_events_visitor_id ON analytics_events (visitor_id);

CREATE TABLE contact_submissions (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(200) NOT NULL, 
	subject VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	source_page VARCHAR(300), 
	status VARCHAR(24) NOT NULL, 
	read_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_contact_submissions PRIMARY KEY (id)
);

CREATE TABLE content_items (
	kind VARCHAR(48) NOT NULL, 
	key VARCHAR(120) NOT NULL, 
	position INTEGER NOT NULL, 
	data JSONB NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_content_items PRIMARY KEY (kind, key)
);

CREATE TABLE visitor_sessions (
	id VARCHAR(64) NOT NULL, 
	visitor_id VARCHAR(64) NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	pageviews INTEGER NOT NULL, 
	engagement_seconds INTEGER NOT NULL, 
	device VARCHAR(24), 
	browser VARCHAR(32), 
	os VARCHAR(32), 
	country VARCHAR(2), 
	referrer_host VARCHAR(160), 
	source VARCHAR(48), 
	landing_path VARCHAR(300), 
	CONSTRAINT pk_visitor_sessions PRIMARY KEY (id)
);
CREATE INDEX ix_visitor_sessions_last_seen ON visitor_sessions (last_seen);
CREATE INDEX ix_visitor_sessions_visitor_id ON visitor_sessions (visitor_id);
CREATE INDEX ix_visitor_sessions_visitor_last ON visitor_sessions (visitor_id, last_seen);

COMMIT;
