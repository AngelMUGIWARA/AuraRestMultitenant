#!/usr/bin/env node
/**
 * Script para crear datos de prueba para validar filtros de Usuarios e Inventario
 * Uso: node scripts/create-test-data.js
 */

const http = require('http');
const querystring = require('querystring');

const API_BASE = 'http://localhost:4000';
const TENANT_SLUG = 'tenant_ejemplo';
const OWNER_EMAIL = 'owner@test.com';
const OWNER_PASSWORD = 'password';

let authToken = null;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': TENANT_SLUG,
      },
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function login() {
  console.log('🔐 Autenticando como OWNER...');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
    });

    if (res.status !== 200) {
      throw new Error(`Login failed: ${res.status} - ${JSON.stringify(res.data)}`);
    }

    authToken = res.data.data.access_token;
    console.log('✅ Login exitoso');
    return true;
  } catch (err) {
    console.error('❌ Error en login:', err.message);
    return false;
  }
}

async function createBranches() {
  console.log('\n📍 Creando sucursales...');
  const branches = [
    { name: 'Central', description: 'Sucursal Principal' },
    { name: 'Norte', description: 'Sucursal Norte' },
    { name: 'Oeste', description: 'Sucursal Oeste' },
  ];

  const createdBranches = {};
  for (const branch of branches) {
    try {
      const res = await makeRequest('POST', '/admin/branches', {
        ...branch,
        status: 'active',
      });

      if (res.status === 201) {
        createdBranches[branch.name] = res.data.data.id;
        console.log(`✅ Sucursal "${branch.name}" creada (${createdBranches[branch.name]})`);
      } else {
        console.warn(`⚠️  Error creando "${branch.name}": ${res.status}`);
      }
    } catch (err) {
      console.error(`❌ Error creando "${branch.name}":`, err.message);
    }
  }

  return createdBranches;
}

async function createUsers(branches) {
  console.log('\n👥 Creando usuarios por sucursal...');

  const usersData = [
    { email: 'manager.central@test.com', name: 'Manager Central', role: 'MANAGER', phone: '5551234567', branch: 'Central' },
    { email: 'waiter.central@test.com', name: 'Waiter Central', role: 'WAITER', phone: '5551234568', branch: 'Central' },
    { email: 'manager.norte@test.com', name: 'Manager Norte', role: 'MANAGER', phone: '5551234569', branch: 'Norte' },
    { email: 'cashier.norte@test.com', name: 'Cashier Norte', role: 'CASHIER', phone: '5551234570', branch: 'Norte' },
    { email: 'manager.oeste@test.com', name: 'Manager Oeste', role: 'MANAGER', phone: '5551234571', branch: 'Oeste' },
    { email: 'chef.oeste@test.com', name: 'Chef Oeste', role: 'CHEF', phone: '5551234572', branch: 'Oeste' },
  ];

  for (const userData of usersData) {
    try {
      const branchId = branches[userData.branch];
      if (!branchId) {
        console.warn(`⚠️  Sucursal ${userData.branch} no encontrada`);
        continue;
      }

      const res = await makeRequest('POST', '/admin/users', {
        email: userData.email,
        password: 'testpassword123',
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        branchId,
      });

      if (res.status === 201) {
        console.log(`✅ Usuario "${userData.name}" creado en ${userData.branch}`);
      } else {
        console.warn(`⚠️  Error creando "${userData.name}": ${res.status} - ${JSON.stringify(res.data)}`);
      }
    } catch (err) {
      console.error(`❌ Error creando "${userData.name}":`, err.message);
    }
  }
}

async function createInventory(branches) {
  console.log('\n📦 Creando inventario por sucursal...');

  const inventoryData = [
    { name: 'Producto Test A', branchName: 'Central', quantity: 10 },
    { name: 'Producto Test A', branchName: 'Norte', quantity: 5 },
    { name: 'Producto Test A', branchName: 'Oeste', quantity: 15 },
  ];

  for (const item of inventoryData) {
    try {
      const branchId = branches[item.branchName];
      if (!branchId) {
        console.warn(`⚠️  Sucursal ${item.branchName} no encontrada para inventario`);
        continue;
      }

      // Nota: Ajusta el endpoint según tu API real
      const res = await makeRequest('POST', '/admin/inventory', {
        name: item.name,
        branchId,
        quantity: item.quantity,
        status: 'active',
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`✅ Inventario creado: "${item.name}" x${item.quantity} en ${item.branchName}`);
      } else {
        console.warn(`⚠️  Error creando inventario: ${res.status}`);
      }
    } catch (err) {
      console.error(`❌ Error creando inventario:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Iniciando creación de datos de prueba para validación de filtros\n');

  if (!await login()) {
    process.exit(1);
  }

  const branches = await createBranches();

  if (Object.keys(branches).length === 0) {
    console.error('❌ No se pudieron crear sucursales');
    process.exit(1);
  }

  await createUsers(branches);
  await createInventory(branches);

  console.log('\n✅ Datos de prueba creados exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Abre http://localhost:5011 en el navegador');
  console.log('2. Navega a la sección de Usuarios');
  console.log('3. Verifica que los usuarios aparezcan filtrados por sucursal');
  console.log('4. Prueba los botones Editar y Activar/Desactivar');
  console.log('5. Valida que los filtros de Inventario funcionen correctamente');
}

main().catch((err) => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
