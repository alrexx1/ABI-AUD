const fs = require('fs');
const zlib = require('zlib');

const g = new Uint8Array([65, 66, 73, 68, 52]);
const G = new Uint8Array([18, 29, 223, 205, 21, 134, 207, 83, 127, 187, 169, 138, 87, 209, 251, 243, 168, 40, 189, 222, 249, 37, 6, 109, 14, 34, 99, 46, 254, 110, 88, 244]);

const H = Object.freeze("oitaRdeepSevoMSDA|ycaruccA|egamaDtsujdAretpadA|XaoMsdA|YaoMsdA|egamaDromrA|traPyBelacSytilibitcurtseDromrA|egamaDesaB|deepSesaB|kcolBroFytilibaborPdeelB|ydoBroFytilibaborPdeelB|noitarteneProFytilibaborPdeelB|rotcaFegamaDhguorhTtiHydoB|ytilibaborPhguorhTtiHydoB|elacSegamaDnekorB|ytilibaborPnekorB|rotcaFegamaDkcolBtelluB|sretpahC|elttaBenOnIetelpmoC|tnuoC|dInosaeStnerruC|etaDataD|snarT_cseD|snarT_liateD|scimonognE|etaReriF|rotcaFecneulfnIemiThsalF|pxEtfiG|elbuRtfiG|dIpuorG|tceffEneercSnekorBsaH|lioceRlatnoziroH|dInocI|dI|epyTrotacidnIdnuoSerongI|ecnatsiseRtcapmI|weiverPsI|seniL|AOM|ateM|senotseliM|elacSlaniFaoM|elacSaoM|XaoM|YaoM|deepSevoM|oitaRdeepSevoM|yticoleVelzzuM|snarT_emaN|muNhsiniFdeeN|oN|rotcaFnoitarteneP|leveLnoitarteneP|cigoLerP|sksaTerP|senoBtiHyramirP|ssergorP|ytreporP|emaNytreporP|sdraweR|dIksaTtooR|dInosaeS|snarT_emaNnosaeS|senoBtiHyradnoceS|telluBenOnIstohS|redrOwohS|oitaRdeepSklaWtneliS|ecneulfnIleveLrotacidnIdnuoS|rotcaFecneulfnIecnatsiDxaMrotacidnIdnuoS|ecneulfnIleveLdnuoS|rotcaFecneulfnIecnatsiDxaMdnuoS|ecruoS|epyTtegraT|stegraT|tnuoCksaT|sksaT|snarT_eltiT|deepSnruT|epyT|noisreV|lioceRlacitreV|loClausiV|ytilibatSnopaeW|ecnatsiDporDoreZ|seirossecca|sexiffa|gaTomma|rotcafnoitartenepitna_romra|kcolbrofelacsegamad_romra|ytilibitcurtsed_romra|ksamtcetorpliateddaeh_romra|level_romra|di_lairetam_romra|tneiciffeoc_etartenep_romra|tnatsnoc_tneiciffeoc_etartenep_romra|ksamtcetorp_romra|elgnatehcocir_romra|nwodlooctehcocir_romra|xamytilibaborptehcocir_romra|nimytilibaborptehcocir_romra|sromra|tnegnaTevirra|thgieWtnegnaTevirra|gaTelbmessa|xaMytilibaruDtnirpeulb|sffub|ecnatsiDporDnigeBtellub|stellub|rebilac|yrogetac|sdIyrosseccAelbitapmoc|ecirPtcatnoc|sdnoceSnwodlooc|tsoc|tnuoc|egamad|ecnatsiDegamad|evruCecnatsiDegamad|reifidoMecnatsiDegamad|niMegamad|ecnatsiDoreZyfidoMegamad|noitpircsed|pord|eluRetacilpud|tsoCytilibarud|xaMytilibarud|seulaVytilibarud|noitarud|tceffe|noitpircseDygrene|tnuoCtsoCartxe|dImetItsoCartxe|tnuoCartxe|noitpircseDartxe|tnuoCtuptuOartxe|dImetItuptuOartxe|sdnoceSemiTartxe|xaMytilibaruDyrotcaf|sedirrevOlavretnIerif|eulaVlavretnIerif|latoTthgieWpuorg|ssoLhtlaeh|elbaliavAnoci|dInoci|di|pretni|puorGmeti|spuorGmeti|dImeti|smeti|yek|dnik|lebal|yeKlebal|tnegnaTevael|thgieWtnegnaTevael|level|srojam|dIlairetam|slairetam|atem|tnuoCnim|sdnoceSnim|sronim|eman|epyTromrAevitan|flehSehTno|tnuoCtuptuo|daolrevo|trap|evruCecnatsiDnoitartenep|pukcip|sloop|ecirp|ytilibaborp|stcudorp|eliforp|seliforp|straPtcetorp|ytilauq|slooPytilauq|erahSthgieWytilauq|ytirar|sepicer|tnuoCecuder|tnecrePecuder|ecirPecnerefer|dImetIecalper|hcraeser|noisreVamehcs|erocs|nosaes|lanosaes|wohs|ezis|roniMpiks|stekcos|tros|dIdnuos|sdnuos|stats|sgaTdetroppus|elbat|gat|edoMtnegnat|edoMthgieWtnegnat|emit|latot|thgieWlatot|stnemtaert|epyt|dIepyt|sepyt|tinu|eulav|noisrev|snopaew|thgiew|gKthgiew|latoTthgiew".split("|").map(e=>[...e].reverse().join("")));
const K = new Map(H.map(e => [Z(e), e]));

function Z(e) {
  let t = 2166136261;
  for (let a = 0; a < e.length; a++) t = Math.imul(t ^ e.charCodeAt(a), 16777619) >>> 0;
  return 2147483648 + (t & 1073741823);
}

function Q(e) {
  if (e < 2147483648) return String(e);
  const t = K.get(e);
  if (!t) throw new Error("Unknown field: " + e);
  return t;
}

class ee {
  constructor(t) { this.value = t; this.offset = 0; }
  get end() { return this.offset === this.value.length; }
  byte() { return this.value[this.offset++]; }
  bytes(t) {
    const a = this.value.slice(this.offset, this.offset + t);
    this.offset += t;
    return a;
  }
  varUint() {
    let t = 0, a = 0;
    for (; a < 35;) {
      const r = this.byte();
      if (t += (r & 127) * (2 ** a), !(r & 128)) return t;
      a += 7;
    }
    throw new Error("Invalid varint");
  }
  text(t) { return new TextDecoder().decode(this.bytes(t)); }
  double() {
    const t = new DataView(this.value.buffer, this.value.byteOffset + this.offset, 8).getFloat64(0, !0);
    this.offset += 8;
    return t;
  }
}

function D(e, t) {
  switch (e.byte()) {
    case 0: return null;
    case 1: return false;
    case 2: return true;
    case 3: return e.double();
    case 4: return t[e.varUint()];
    case 5: return Array.from({ length: e.varUint() }, () => D(e, t));
    case 6: {
      const a = {};
      for (let r = e.varUint(); r > 0; r--) a[Q(e.varUint())] = D(e, t);
      return a;
    }
    default: throw new Error("Unsupported value type");
  }
}

function Y(e) {
  const t = new URL(e).pathname, a = t.slice(t.lastIndexOf("/") + 1), r = a.lastIndexOf(".");
  return (r > 0 ? a.slice(0, r) : a).toUpperCase();
}

async function decryptFile(urlStr) {
  const t = Y(urlStr);
  const resp = await fetch(urlStr);
  const buf = await resp.arrayBuffer();
  const a = new Uint8Array(buf);
  
  const isProtected = a.length >= 5 && a[0]===65 && a[1]===66 && a[2]===73 && a[3]===68 && a[4]===52;
  if (!isProtected) return JSON.parse(new TextDecoder().decode(buf));
  
  const sha256Buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  const hmacKey = await crypto.subtle.importKey("raw", G, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const derivedKeyRaw = await crypto.subtle.sign("HMAC", hmacKey, sha256Buf);
  const aesKey = await crypto.subtle.importKey("raw", derivedKeyRaw, "AES-GCM", false, ["decrypt"]);
  
  const iv = a.slice(5, 5 + 12);
  const ciphertext = a.slice(5 + 12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: g, tagLength: 128 }, aesKey, ciphertext);
  
  const decompressed = zlib.gunzipSync(Buffer.from(decrypted));
  const h = new ee(new Uint8Array(decompressed));
  const magic = h.bytes(3);
  if (magic[0] !== 80 || magic[1] !== 75 || magic[2] !== 52 || h.byte() !== 1) {
    throw new Error("Bad header");
  }
  const strCount = h.varUint();
  const stringTable = Array.from({ length: strCount }, () => h.text(h.varUint()));
  return D(h, stringTable);
}

async function main() {
  console.log("Decrypting items details...");
  const data = await decryptFile('https://hexaov91.github.io/abi-assets/data/items/details.json');
  fs.writeFileSync('items_details_unpacked.json', JSON.stringify(data, null, 2), 'utf-8');
  console.log('Saved items_details_unpacked.json, keys:', Object.keys(data));
}

main().catch(console.error);
