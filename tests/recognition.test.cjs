const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { addEventListener() {}, getContext() { return {}; } });
  return elements.get(id);
}
const sandbox = { document: { getElementById: element, createElement: element, addEventListener() {} },
  window: { addEventListener() {} }, localStorage: { getItem() { return null; } }, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
test('o código JavaScript completo pode ser analisado e inicializado', () => assert.ok(sandbox.cropRegion));
test('mira central no vídeo horizontal apresentado num ecrã vertical', () => {
  const crop = sandbox.cropRegion(1920,1080,360,480,{ x:54,y:114,width:252,height:252 });
  assert.equal(crop.x,676.5); assert.equal(crop.y,256.5);
  assert.equal(crop.width,567); assert.equal(crop.height,567);
});
test('mira central no vídeo vertical apresentado num ecrã horizontal', () => {
  const crop = sandbox.cropRegion(720,1280,960,480,{x:330,y:90,width:300,height:300});
  assert.equal(crop.x,247.5); assert.equal(crop.y,527.5);
  assert.equal(crop.width,225); assert.equal(crop.height,225);
});
test('seleciona a previsão com maior confiança e rejeita valores inválidos', () => {
  const predictions = [{class:'test tube',confidence:.7},{class:'beaker',confidence:.9},
    {class:'invalid',confidence:90},{class:'invalid',confidence:NaN}];
  assert.equal(sandbox.bestPrediction(predictions,.6).class,'beaker');
  assert.equal(sandbox.bestPrediction(predictions,.95),null);
  assert.equal(sandbox.bestPrediction([],.6),null);
  assert.throws(() => sandbox.bestPrediction({},.6));
});
test('traduz as categorias e preserva categorias desconhecidas', () => {
  assert.equal(sandbox.translatedName('Test_Tube'),'Tubo de ensaio');
  assert.equal(sandbox.translatedName('beaker'),'Gobelé');
  assert.equal(sandbox.translatedName('new apparatus'),'new apparatus');
});
test('aceita modelos antigos e atuais, rejeitando identificadores inválidos', () => {
  assert.equal(sandbox.parseModel('chemlab-1yg0i/3').version,3);
  assert.equal(sandbox.parseModel('workspace/model-yolov8n').id,'workspace/model-yolov8n');
  for (const invalid of ['','https://example.com/model','project/0','project/-1','a/b/c']) {
    assert.throws(() => sandbox.parseModel(invalid));
  }
});
test('usa a chave pública integrada mesmo com definições antigas sem chave', async () => {
  const calls = [];
  const isolated = { ...sandbox, localStorage: { getItem() {
    return JSON.stringify({model:'chemlab-1yg0i/3',threshold:.6,key:'',remember:false});
  } }, window: { addEventListener() {}, inferencejs: { InferenceEngine: class {
    async startWorker(project,version,key) { calls.push({project,version,key}); return 7; }
  } } } };
  vm.createContext(isolated);
  vm.runInContext(source,isolated);
  await isolated.ensureModel();
  assert.equal(calls.length,1);
  assert.equal(calls[0].project,'chemlab-1yg0i');
  assert.equal(calls[0].version,3);
  assert.equal(calls[0].key,vm.runInContext('PUBLIC_KEY',isolated));
  assert.ok(calls[0].key.startsWith('rf_'));
  assert.equal(html.includes('id="publicKey"'),false);
});
