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
function recognitionHarness(predictions) {
  const nodes = new Map(), draws = [], scheduled = [];
  let stopped = 0, paused = 0, requested = 0;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      hidden:true, style:{}, classList:{add(){},remove(){},toggle(){}},
      addEventListener(){}, getContext(){return {drawImage(...args){draws.push({id,args});}};},
      getBoundingClientRect(){return {left:0,top:0,width:300,height:300};},
      videoWidth:1280,videoHeight:720,readyState:4,
      pause(){paused++;}, async play(){}
    });
    return nodes.get(id);
  }
  const media = {getTracks(){return [{stop(){stopped++;}}];}};
  const scope = {
    document:{getElementById:node,createElement:()=>node('cropCanvas'),addEventListener(){}},
    window:{addEventListener(){},isSecureContext:true},
    navigator:{mediaDevices:{async getUserMedia(){requested++;return media;}}},
    localStorage:{getItem(){return null;}},
    setTimeout(fn,delay){scheduled.push({fn,delay});return scheduled.length;}, clearTimeout(){},
    async createImageBitmap(){return {close(){}};},
    testEngine:{async infer(){return predictions;}},testStream:media
  };
  vm.createContext(scope); vm.runInContext(source,scope);
  vm.runInContext('running=true; generation=12; workerId=7; engine=testEngine; stream=testStream;',scope);
  return {scope,node,draws,scheduled,get stopped(){return stopped;},get paused(){return paused;},get requested(){return requested;}};
}
test('congela o fotograma analisado, conserva o resultado e para a câmara até ao seguinte', async () => {
  const h = recognitionHarness([{class:'beaker',confidence:.87}]);
  await h.scope.recognize(12);
  assert.equal(h.node('resultName').textContent,'Gobelé');
  assert.equal(h.node('resultConfidence').textContent,'87%');
  assert.equal(h.node('capturedFrame').hidden,false);
  assert.equal(h.node('nextButton').hidden,false);
  assert.equal(h.stopped,1); assert.equal(h.paused,1);
  assert.equal(vm.runInContext('running',h.scope),false);
  assert.equal(h.scheduled.length,0);
  assert.equal(h.draws[0].id,'capturedFrame');
  assert.equal(h.draws[1].args[0],h.node('capturedFrame'));
  // O mesmo worker é reutilizado; a câmara e a análise só retomam por ação do aluno.
  h.scope.testEngine.infer = async () => [];
  await h.scope.startCamera();
  await new Promise(setImmediate);
  assert.equal(h.requested,1);
  assert.equal(h.node('capturedFrame').hidden,true);
  assert.equal(h.node('nextButton').hidden,true);
  assert.equal(vm.runInContext('running',h.scope),true);
  assert.equal(h.node('resultConfidence').textContent,'—');
});
test('continua a procurar quando nenhuma previsão atinge a confiança mínima', async () => {
  const h = recognitionHarness([{class:'beaker',confidence:.4}]);
  await h.scope.recognize(12);
  assert.equal(h.node('capturedFrame').hidden,true);
  assert.equal(h.stopped,0);
  assert.equal(vm.runInContext('running',h.scope),true);
  assert.equal(h.scheduled.length,1);
});
test('ignora um resultado que chega depois de cancelar a análise', async () => {
  const h = recognitionHarness([]);
  h.scope.testEngine.infer = async () => {
    vm.runInContext('generation++; running=false;',h.scope);
    return [{class:'beaker',confidence:.99}];
  };
  await h.scope.recognize(12);
  assert.equal(h.node('capturedFrame').hidden,true);
  assert.equal(h.stopped,0); assert.equal(h.scheduled.length,0);
});
