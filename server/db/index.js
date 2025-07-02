// server/db/index.js
// Database setup and prepared statements for PostgreSQL

import pg from 'pg';
const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  // You should load these from environment variables in a real application
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'mmorpg',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres'
});

// Test the database connection
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL database:', err);
  });

// Prepared statements for PostgreSQL
const statements = {
  // Account statements
  getUserByUsername: 'SELECT * FROM accounts WHERE username = $1',
  createUser: 'INSERT INTO accounts (username, password_hash, email) VALUES ($1, $2, $3) RETURNING account_id',
  updateLastLogin: 'UPDATE accounts SET last_login = NOW() WHERE account_id = $1',
  
  // Character statements
  getCharactersByAccount: 'SELECT * FROM characters WHERE account_id = $1',
  getCharacterByName: 'SELECT * FROM characters WHERE character_name = $1',
  createCharacter: 'INSERT INTO characters (account_id, character_name, appearance) VALUES ($1, $2, $3) RETURNING character_id',
  getCharacterState: 'SELECT * FROM characters WHERE character_id = $1',
  saveCharacterState: `UPDATE characters 
    SET pos_x = $2, pos_y = $3, pos_z = $4, 
        rot_x = $5, rot_y = $6, rot_z = $7, 
        last_played = NOW() 
    WHERE character_id = $1`,
  updateCharacterGold: 'UPDATE characters SET gold = gold + $2 WHERE character_id = $1',
  updateCharacterAppearance: 'UPDATE characters SET appearance = $2 WHERE character_id = $1',
  
  // Inventory statements
  getCharacterInventory: 'SELECT ci.*, i.item_name, i.description FROM character_inventory ci JOIN items i ON ci.item_id = i.item_id WHERE character_id = $1 ORDER BY slot_index',
  setInventoryItem: 'INSERT INTO character_inventory (character_id, slot_index, item_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT (character_id, slot_index) DO UPDATE SET item_id = $3, quantity = $4',
  updateInventoryItemQuantity: 'UPDATE character_inventory SET quantity = $3 WHERE character_id = $1 AND slot_index = $2',
  removeInventoryItem: 'DELETE FROM character_inventory WHERE character_id = $1 AND slot_index = $2',
  clearCharacterInventory: 'DELETE FROM character_inventory WHERE character_id = $1',
  
  // Equipment statements
  getCharacterEquipment: 'SELECT ce.*, i.item_name, i.description FROM character_equipment ce JOIN items i ON ce.item_id = i.item_id WHERE character_id = $1',
  equipItem: 'INSERT INTO character_equipment (character_id, equipment_slot, item_id) VALUES ($1, $2, $3) ON CONFLICT (character_id, equipment_slot) DO UPDATE SET item_id = $3',
  unequipItem: 'DELETE FROM character_equipment WHERE character_id = $1 AND equipment_slot = $2',
  
  // World item statements
  getDroppedItems: 'SELECT * FROM dropped_items di JOIN items i ON di.item_id = i.item_id',
  getNearbyDroppedItems: `SELECT * FROM dropped_items di 
    JOIN items i ON di.item_id = i.item_id 
    WHERE pos_x BETWEEN $1 - $4 AND $1 + $4 
    AND pos_y BETWEEN $2 - $4 AND $2 + $4 
    AND pos_z BETWEEN $3 - $4 AND $3 + $4`,
  addDroppedItem: 'INSERT INTO dropped_items (item_id, quantity, pos_x, pos_y, pos_z, owner_character_id, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING instance_id',
  removeDroppedItem: 'DELETE FROM dropped_items WHERE instance_id = $1',
  
  // Resource statements
  getResourceInstances: 'SELECT * FROM resource_instances ri JOIN resource_nodes rn ON ri.node_id = rn.node_id',
  getNearbyResources: `SELECT * FROM resource_instances ri 
    JOIN resource_nodes rn ON ri.node_id = rn.node_id
    WHERE pos_x BETWEEN $1 - $4 AND $1 + $4 
    AND pos_y BETWEEN $2 - $4 AND $2 + $4 
    AND pos_z BETWEEN $3 - $4 AND $3 + $4`,
  depleteResource: 'UPDATE resource_instances SET is_depleted = true, respawn_at = NOW() + (SELECT respawn_time_ms * INTERVAL \'1 millisecond\' FROM resource_nodes WHERE node_id = resource_instances.node_id) WHERE instance_id = $1',
  respawnResources: 'UPDATE resource_instances SET is_depleted = false, respawn_at = NULL WHERE respawn_at <= NOW()',
  
  // Skills statements
  getCharacterSkills: 'SELECT cs.*, s.display_name FROM character_skills cs JOIN skills s ON cs.skill_id = s.skill_id WHERE character_id = $1',
  initCharacterSkill: 'INSERT INTO character_skills (character_id, skill_id, xp) VALUES ($1, $2, 0) ON CONFLICT (character_id, skill_id) DO NOTHING',
  updateSkillXp: 'UPDATE character_skills SET xp = xp + $3 WHERE character_id = $1 AND skill_id = $2',
  
  // Quest statements
  getCharacterQuests: 'SELECT cq.*, q.title, q.description FROM character_quests cq JOIN quests q ON cq.quest_id = q.quest_id WHERE character_id = $1',
  startQuest: 'INSERT INTO character_quests (character_id, quest_id, status, progress) VALUES ($1, $2, \'in_progress\', $3) ON CONFLICT (character_id, quest_id) DO NOTHING',
  updateQuestProgress: 'UPDATE character_quests SET progress = $3 WHERE character_id = $1 AND quest_id = $2',
  completeQuest: 'UPDATE character_quests SET status = \'completed\', completed_at = NOW() WHERE character_id = $1 AND quest_id = $2',
  
  // Chat statements
  insertChatMessage: 'INSERT INTO chat_logs (character_id, character_name, message, channel) VALUES ($1, $2, $3, $4)',
  getRecentChatMessages: 'SELECT * FROM chat_logs WHERE channel = $1 ORDER BY created_at DESC LIMIT $2',
  
  // Guild statements
  createGuild: 'INSERT INTO guilds (guild_name, owner_character_id) VALUES ($1, $2) RETURNING guild_id',
  addGuildMember: 'INSERT INTO guild_members (guild_id, character_id, rank) VALUES ($1, $2, $3)',
  getGuildMembers: 'SELECT gm.*, c.character_name FROM guild_members gm JOIN characters c ON gm.character_id = c.character_id WHERE guild_id = $1',
  
  // Game definitions
  getAllItems: 'SELECT * FROM items',
  getItemById: 'SELECT * FROM items WHERE item_id = $1',
  getAllSkills: 'SELECT * FROM skills',
  getAllResourceNodes: 'SELECT * FROM resource_nodes',
  getAllNpcs: 'SELECT * FROM npcs',
  getAllShops: 'SELECT * FROM shops',
  getShopInventory: 'SELECT s.*, i.item_name, i.description, i.base_value FROM shops s, jsonb_to_recordset(s.default_stock) AS stock(item_id VARCHAR, quantity INT, buy_price_override INT) JOIN items i ON stock.item_id = i.item_id WHERE s.shop_id = $1'
};

// Helper function to execute prepared statements with parameters
async function query(statementName, params = []) {
  const statement = statements[statementName];
  if (!statement) {
    throw new Error(`Prepared statement '${statementName}' not found`);
  }
  
  try {
    const result = await pool.query(statement, params);
    return result.rows;
  } catch (error) {
    console.error(`Error executing query '${statementName}':`, error);
    throw error;
  }
}

// Export the database connection pool and query function
export { pool, query, statements };
