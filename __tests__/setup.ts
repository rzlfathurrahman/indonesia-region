import { Knex, knex } from 'knex';

let testDb: Knex | null = null;
let schemaCreated = false;

export async function getTestDb(): Promise<Knex> {
  if (testDb) return testDb;

  testDb = knex({
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    pool: { min: 0, max: 1 }
  });

  if (!schemaCreated) {
    await testDb.schema.createTable('provinces', (table) => {
      table.string('code', 10).primary();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(testDb!.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(testDb!.fn.now());
    });

    await testDb.schema.createTable('regencies', (table) => {
      table.string('code', 10).primary();
      table.string('province_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(testDb!.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(testDb!.fn.now());
    });

    await testDb.schema.createTable('districts', (table) => {
      table.string('code', 10).primary();
      table.string('regency_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(testDb!.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(testDb!.fn.now());
    });

    await testDb.schema.createTable('villages', (table) => {
      table.string('code', 10).primary();
      table.string('district_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(testDb!.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(testDb!.fn.now());
    });

    await testDb.schema.createTable('region_changes', (table) => {
      table.increments('id').primary();
      table.enum('change_type', ['SPLIT', 'MERGE', 'RENAME', 'TRANSFER']).notNullable();
      table.string('old_code', 10).notNullable();
      table.string('new_code', 10).nullable();
      table.string('old_parent_code', 10).nullable();
      table.string('new_parent_code', 10).nullable();
      table.string('old_name', 255).notNullable();
      table.string('new_name', 255).nullable();
      table.date('effective_date').notNullable();
      table.string('reference_number', 255).nullable();
      table.text('description').nullable();
      table.timestamp('created_at').notNullable().defaultTo(testDb!.fn.now());
    });

    schemaCreated = true;
  }

  return testDb;
}

export async function cleanupTestDb(): Promise<void> {
  if (testDb) {
    await testDb('villages').del();
    await testDb('districts').del();
    await testDb('regencies').del();
    await testDb('provinces').del();
    await testDb('region_changes').del();
  }
}

export async function closeTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
    schemaCreated = false;
  }
}

export async function seedTestData(): Promise<void> {
  const db = await getTestDb();

  await db('provinces').insert([
    { code: '11', name: 'ACEH', is_active: true },
    { code: '31', name: 'DKI JAKARTA', is_active: true },
    { code: '32', name: 'JAWA BARAT', is_active: true }
  ]);

  await db('regencies').insert([
    { code: '1101', province_code: '11', name: 'KAB. SIMEULUE', is_active: true },
    { code: '1102', province_code: '11', name: 'KAB. ACEH SINGKIL', is_active: true },
    { code: '3171', province_code: '31', name: 'KOTA JAKARTA SELATAN', is_active: true },
    { code: '3172', province_code: '31', name: 'KOTA JAKARTA TIMUR', is_active: true }
  ]);

  await db('districts').insert([
    { code: '1101010', regency_code: '1101', name: 'TEUPAH SELATAN', is_active: true },
    { code: '1101020', regency_code: '1101', name: 'SIMEULUE TIMUR', is_active: true },
    { code: '3171010', regency_code: '3171', name: 'JAGAKARSA', is_active: true },
    { code: '3171020', regency_code: '3171', name: 'PASAR MINGGU', is_active: true }
  ]);

  await db('villages').insert([
    { code: '1101010001', district_code: '1101010', name: 'KUTA PADANG', is_active: true },
    { code: '1101010002', district_code: '1101010', name: 'RAKET', is_active: true },
    { code: '3171010001', district_code: '3171010', name: 'CILANDAK TIMUR', is_active: true },
    { code: '3171010002', district_code: '3171010', name: 'JAGAKARSA', is_active: true }
  ]);
}
