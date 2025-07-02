-- ====================================================================
--                  MMORPG PostgreSQL Data Model
-- ====================================================================
-- This schema is designed for a scalable, data-driven MMORPG.
-- It normalizes data structures and moves static game definitions
-- into the database to allow for easier content management.
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- SECTION 1: CORE GAME DEFINITIONS (STATIC DATA)
-- These tables replace the hardcoded config files (items.json, resources.js, etc.)
-- ====================================================================

CREATE TABLE skills (
    skill_id VARCHAR(50) PRIMARY KEY, -- e.g., 'mining', 'woodcutting', 'attack'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_level INT NOT NULL DEFAULT 99
);

CREATE TABLE items (
    item_id VARCHAR(100) PRIMARY KEY, -- A unique string ID like 'iron_ore' or 'bronze_sword'
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL, -- e.g., 'resource', 'weapon', 'armor', 'consumable'
    is_stackable BOOLEAN NOT NULL DEFAULT TRUE,
    max_stack_size INT DEFAULT 1000,
    equipment_slot VARCHAR(50), -- e.g., 'main_hand', 'chest', 'legs'. NULL if not equippable
    base_value INT DEFAULT 0, -- Default gold value
    metadata JSONB -- For storing type-specific attributes, e.g., { "damage": 10, "speed": 2.4 } for weapons
);

CREATE TABLE resource_nodes (
    node_id VARCHAR(100) PRIMARY KEY, -- e.g., 'copper_rock_node', 'oak_tree_node'
    display_name VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL, -- e.g., 'rock', 'tree'
    harvest_time_ms INT NOT NULL,
    respawn_time_ms INT NOT NULL,
    required_skill_id VARCHAR(50) REFERENCES skills(skill_id),
    required_level INT NOT NULL,
    xp_yield INT NOT NULL,
    -- Defines what items can be yielded, with chances
    -- e.g., [{ "item_id": "copper_ore", "min": 1, "max": 1, "chance": 1.0 }]
    yield_table JSONB NOT NULL
);

CREATE TABLE npcs (
    npc_id VARCHAR(100) PRIMARY KEY, -- e.g., 'goblin_warrior', 'town_guard_bob'
    display_name VARCHAR(255) NOT NULL,
    npc_type VARCHAR(50) NOT NULL, -- e.g., 'monster', 'vendor', 'quest_giver'
    level INT,
    base_stats JSONB, -- { "health": 100, "damage": 5, "armor": 2 }
    loot_table JSONB, -- [{ "item_id": "gold_coin", "min": 1, "max": 10, "chance": 0.8 }]
    dialogue_tree_id VARCHAR(100) -- Optional link to a dialogue system
);

CREATE TABLE shops (
    shop_id VARCHAR(100) PRIMARY KEY, -- e.g., 'varrock_general_store'
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    -- e.g., [{ "item_id": "bronze_axe", "quantity": 10, "buy_price_override": 150 }]
    -- quantity -1 for infinite
    default_stock JSONB,
    buy_price_modifier FLOAT NOT NULL DEFAULT 1.0, -- Multiplier for items player buys
    sell_price_modifier FLOAT NOT NULL DEFAULT 0.5 -- Multiplier for items player sells
);

CREATE TABLE quests (
    quest_id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    required_level INT DEFAULT 1,
    prerequisite_quest_id VARCHAR(100) REFERENCES quests(quest_id),
    -- Stores objectives, e.g., { "type": "gather", "item_id": "goblin_ear", "count": 10 }
    -- or { "type": "talk_to", "npc_id": "king_arthur" }
    objectives JSONB NOT NULL,
    rewards JSONB NOT NULL -- { "xp": 500, "gold": 100, "items": [{ "item_id": "magic_sword", "quantity": 1 }] }
);


-- ====================================================================
-- SECTION 2: ACCOUNT & CHARACTER DATA (DYNAMIC DATA)
-- These tables store player-specific information.
-- ====================================================================

CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE characters (
    character_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    character_name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_played TIMESTAMPTZ,
    gold BIGINT NOT NULL DEFAULT 0,
    -- Current state like position, health, etc.
    pos_x FLOAT NOT NULL DEFAULT 0,
    pos_y FLOAT NOT NULL DEFAULT 0,
    pos_z FLOAT NOT NULL DEFAULT 0,
    rot_x FLOAT NOT NULL DEFAULT 0,
    rot_y FLOAT NOT NULL DEFAULT 0,
    rot_z FLOAT NOT NULL DEFAULT 0,
    current_health INT NOT NULL DEFAULT 100,
    current_mana INT NOT NULL DEFAULT 50,
    -- Stores visual appearance data
    appearance JSONB -- e.g., { "hair_color": "#...", "skin_tone": "..." }
);

CREATE TABLE character_inventory (
    character_id UUID NOT NULL REFERENCES characters(character_id) ON DELETE CASCADE,
    slot_index INT NOT NULL, -- The inventory slot number (0-27, etc.)
    item_id VARCHAR(100) NOT NULL REFERENCES items(item_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (character_id, slot_index)
);

CREATE TABLE character_equipment (
    character_id UUID NOT NULL REFERENCES characters(character_id) ON DELETE CASCADE,
    -- The slot name must match a value from items.equipment_slot
    equipment_slot VARCHAR(50) NOT NULL,
    item_id VARCHAR(100) NOT NULL REFERENCES items(item_id),
    PRIMARY KEY (character_id, equipment_slot)
);

CREATE TABLE character_skills (
    character_id UUID NOT NULL REFERENCES characters(character_id) ON DELETE CASCADE,
    skill_id VARCHAR(50) NOT NULL REFERENCES skills(skill_id),
    xp INT NOT NULL DEFAULT 0,
    PRIMARY KEY (character_id, skill_id)
);

CREATE TABLE character_quests (
    character_id UUID NOT NULL REFERENCES characters(character_id) ON DELETE CASCADE,
    quest_id VARCHAR(100) NOT NULL REFERENCES quests(quest_id),
    status VARCHAR(20) NOT NULL, -- e.g., 'not_started', 'in_progress', 'completed'
    -- Stores current progress against objectives
    -- e.g., { "goblins_killed": 5 }
    progress JSONB,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (character_id, quest_id)
);


-- ====================================================================
-- SECTION 3: WORLD STATE (DYNAMIC DATA)
-- These tables manage the state of the game world itself.
-- ====================================================================

CREATE TABLE dropped_items (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(100) NOT NULL REFERENCES items(item_id),
    quantity INT NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    dropped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Can be NULL if dropped by system; references character who dropped it
    owner_character_id UUID REFERENCES characters(character_id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Becomes public after a timeout
    public_at TIMESTAMPTZ
);

CREATE TABLE resource_instances (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) NOT NULL REFERENCES resource_nodes(node_id),
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    is_depleted BOOLEAN NOT NULL DEFAULT FALSE,
    respawn_at TIMESTAMPTZ
);


-- ====================================================================
-- SECTION 4: SOCIAL & LOGGING
-- ====================================================================

CREATE TABLE chat_logs (
    log_id BIGSERIAL PRIMARY KEY,
    character_id UUID REFERENCES characters(character_id) ON DELETE SET NULL,
    character_name VARCHAR(50), -- Denormalized for easy lookup of old chats
    message TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'public', -- e.g., 'public', 'trade', 'guild'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guilds (
    guild_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_name VARCHAR(100) UNIQUE NOT NULL,
    owner_character_id UUID NOT NULL UNIQUE REFERENCES characters(character_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guild_members (
    guild_id UUID NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    character_id UUID NOT NULL UNIQUE REFERENCES characters(character_id) ON DELETE CASCADE,
    rank VARCHAR(50) NOT NULL, -- e.g., 'member', 'officer', 'leader'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, character_id)
);

-- ====================================================================
-- SECTION 5: DATABASE METADATA
-- ====================================================================

-- This table is used by migration tools to track which schema changes have been applied.
-- It replaces the need for manual checks like in your original migrate.js.
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ====================================================================
--                      INDEXES FOR PERFORMANCE
-- ====================================================================


-- Accounts
CREATE INDEX idx_accounts_username ON accounts(username);

-- Characters
CREATE INDEX idx_characters_account_id ON characters(account_id);
CREATE INDEX idx_characters_character_name ON characters(character_name);

-- Inventory/Equipment
CREATE INDEX idx_character_inventory_character_id ON character_inventory(character_id);
CREATE INDEX idx_character_equipment_character_id ON character_equipment(character_id);

-- Skills/Quests
CREATE INDEX idx_character_skills_character_id ON character_skills(character_id);
CREATE INDEX idx_character_quests_character_id ON character_quests(character_id);

-- World Items
CREATE INDEX idx_dropped_items_pos ON dropped_items (pos_x, pos_y, pos_z);
CREATE INDEX idx_resource_instances_pos ON resource_instances (pos_x, pos_y, pos_z);

-- ====================================================================
-- SECTION 6: WEB & INFRASTRUCTURE
-- ====================================================================

-- This table is compatible with session stores like 'connect-pg-simple'
-- and replaces the file-based session store (connect-sqlite3).
CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_expire ON sessions(expire);
