/**
 * SUITE DE PRUEBAS UNITARIAS: INTEGRIDAD DE DATOS Y FIRMAS ACÚSTICAS
 * Verifica que ABI_DATA y radar_signatures.json estén completos, íntegros y coherentes.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ABI_DATA = require('../app_data.js');

describe('Base de Datos ABI y Firmas Precalculadas', () => {

  it('debe contener la base de datos oficial con versión e ítems válidos', () => {
    assert.ok(ABI_DATA, 'ABI_DATA debe existir');
    assert.ok(ABI_DATA.version, 'Debe tener número de versión');
    assert.ok(Array.isArray(ABI_DATA.items) && ABI_DATA.items.length > 100, 'Debe contener al menos 100 ítems');
    assert.ok(Array.isArray(ABI_DATA.sounds) && ABI_DATA.sounds.length >= 38, 'Debe contener al menos 38 perfiles de sonido');
  });

  it('cada perfil de sonido debe tener archivos drop y pickup válidos', () => {
    ABI_DATA.sounds.forEach(sound => {
      assert.ok(sound.id !== undefined, `Sonido sin ID: ${JSON.stringify(sound)}`);
      assert.ok(sound.drop, `Sonido ID #${sound.id} debe tener archivo drop`);
      assert.ok(sound.pickup, `Sonido ID #${sound.id} debe tener archivo pickup`);
      assert.ok(typeof sound.name === 'string' && sound.name.length > 0, `Sonido ID #${sound.id} debe tener nombre`);
    });
  });

  it('el archivo radar_signatures.json debe contener 76 plantillas acústicas completas', () => {
    const sigPath = path.join(process.cwd(), 'radar_signatures.json');
    assert.ok(fs.existsSync(sigPath), 'radar_signatures.json debe existir en raíz');

    const content = fs.readFileSync(sigPath, 'utf8');
    const signatures = JSON.parse(content);

    assert.ok(Array.isArray(signatures), 'radar_signatures.json debe ser un array');
    assert.strictEqual(signatures.length, 76, 'Deben existir exactamente 76 firmas (38 drops + 38 pickups)');

    signatures.forEach((tmpl, idx) => {
      assert.ok(tmpl.file, `Template #${idx} debe tener campo file`);
      assert.ok(tmpl.action === 'drop' || tmpl.action === 'pickup', `Template #${idx} debe tener acción drop o pickup`);
      assert.ok(Array.isArray(tmpl.slice1) && tmpl.slice1.length === 24, `Template #${idx} slice1 debe tener 24 bandas`);
      assert.ok(Array.isArray(tmpl.slice2) && tmpl.slice2.length === 24, `Template #${idx} slice2 debe tener 24 bandas`);
      assert.ok(Array.isArray(tmpl.slice3) && tmpl.slice3.length === 24, `Template #${idx} slice3 debe tener 24 bandas`);
      assert.ok(Array.isArray(tmpl.env16) && tmpl.env16.length === 16, `Template #${idx} env16 debe tener 16 puntos`);
      assert.ok(typeof tmpl.centroid === 'number' && tmpl.centroid > 0, `Template #${idx} debe tener centroide numérico`);
      assert.ok(typeof tmpl.dominantFreq === 'number' && tmpl.dominantFreq > 0, `Template #${idx} debe tener dominantFreq`);
    });
  });

  it('todos los ítems rojos de máxima rareza (Tier 6) deben estar presentes', () => {
    const reds = ABI_DATA.items.filter(it => it.isRed);
    assert.ok(reds.length >= 32, `Deben existir al menos 32 ítems rojos (encontrados: ${reds.length})`);

    // Verificar ítems rojos legendarios icónicos
    const teapot = reds.find(r => r.name.toLowerCase().includes('teapot') || r.nameEs.toLowerCase().includes('tetera'));
    assert.ok(teapot, 'La Tetera Antigua debe estar presente');
    assert.strictEqual(teapot.rarity, 6, 'La Tetera Antigua debe ser rareza 6');

    const lion = reds.find(r => r.name.toLowerCase().includes('lion') || r.nameEs.toLowerCase().includes('león'));
    assert.ok(lion, 'El León Dorado debe estar presente');
  });

  it('todos los ítems deben tener su archivo de icono local PNG existente en disco en images/items/', () => {
    ABI_DATA.items.forEach(it => {
      assert.ok(it.iconUrl, `Ítem #${it.id} (${it.nameEs}) debe tener iconUrl`);
      const localPath = path.join(process.cwd(), it.iconUrl);
      assert.ok(fs.existsSync(localPath), `El icono de ${it.nameEs} (${it.iconUrl}) debe existir físicamente en disco`);
      assert.ok(fs.statSync(localPath).size > 500, `El icono de ${it.nameEs} no debe estar vacío o corrupto`);
    });
  });

});

