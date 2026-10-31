# Reconhecedor de material de laboratório

Aplicação em português para computador e telemóvel: câmara, mira central e barra inferior com o nome do material e a confiança do modelo. A aplicação está inteiramente em `index.html`, sem instalação nem compilação.

## Começar

1. Abra <https://chgpires.github.io/reconhecedor-material-laboratorio/> no computador ou telemóvel.
2. Toque em **Ativar câmara**, autorize o acesso e enquadre um só objeto dentro dos quatro cantos. Não é necessário criar conta ou introduzir uma chave. O telemóvel pede preferencialmente a câmara traseira. **Trocar câmara** pede a câmara do lado oposto; num dispositivo com uma só câmara pode manter-se a mesma.
3. As **Definições** são opcionais: permitem mudar o modelo e a confiança mínima. Inicialmente são usados `chemlab-1yg0i/3` e 60%.

O modelo e a biblioteca precisam de Internet para carregar. Depois de carregado, o reconhecimento corre localmente no browser, através de inferencejs 1.3.0. A aplicação não guarda fotografias nem envia imagens para uma API de reconhecimento. O carregamento dos recursos e a autenticação pública comunicam com os respetivos fornecedores. O desempenho depende do dispositivo e do suporte a aceleração gráfica.

A Publishable Key está configurada no HTML para utilização por todos os alunos. É uma credencial pública destinada pelo Roboflow a aplicações no browser; nenhuma chave privada deve ser incluída no código. O armazenamento local guarda apenas as opções de modelo e confiança mínima; chaves guardadas por versões antigas são ignoradas.

## Modelo inicial e limitações

- **ChemLab**, autor **BORIS**, Roboflow Universe: <https://universe.roboflow.com/boris-dzpy1/chemlab-1yg0i>.
- Modelo inicial: `chemlab-1yg0i/3`, Roboflow 3.0 Object Detection (Fast). A página indica domínio público.
- Inclui gobelé, bureta, Erlenmeyer, proveta, tubo de ensaio, balão de fundo redondo, ampola de decantação, lamparina, vidro de relógio e outras categorias, incluindo objetos genéricos. Algumas categorias têm nomes abrangentes, como “flask”; a aplicação preserva essa generalidade.
- É um modelo para experimentar, ainda sem validação com o material da escola. A página do projeto apresenta mAP@50 de 42,8%, precisão de 69,8% e recall de 31,3% (consulta em 31/10/2026). Essas métricas não garantem o desempenho da aplicação com objetos reais.
- A percentagem é a confiança de uma previsão individual, não a exatidão global do modelo. A aplicação mostra a previsão com maior confiança acima do limiar, apenas na imagem recortada pela mira. Não simula resultados quando não existe um modelo carregado.
- A compatibilidade e o acesso efetivo ao modelo têm de ser confirmados com a sua chave pública. Ainda não foi feito um ensaio real de inferência com credenciais.

Para mudar de modelo, use **Definições → Modelo**: aceita `projeto/versão` para modelos antigos e `workspace/modelo` para identificadores atuais. Escolha um modelo de **deteção de objetos compatível com inferencejs**, por exemplo Roboflow 3.0 ou outra arquitetura suportada. Ter um dataset público não significa que exista um modelo treinado ou que o acesso através da sua chave esteja disponível. Categorias conhecidas são traduzidas; as restantes mostram o nome fornecido pelo modelo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `reconhecedor-material-laboratorio`.
2. Carregue `index.html` e, opcionalmente, este `README.md`. O HTML deve ficar na raiz.
3. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, pasta **/ (root)**, e guarde.
5. Aguarde a publicação e abra o endereço apresentado pelo GitHub Pages. Use esse mesmo endereço no telemóvel.

Não é necessário um servidor próprio. Abrir o ficheiro por duplo clique pode ter restrições de câmara e de carregamento do modelo; para uso normal, use HTTPS. Para desenvolvimento no computador pode servir a pasta em `http://localhost`. Abrir o endereço HTTP da rede local no telemóvel não fornece o contexto seguro necessário à câmara.

## Verificação local

Com Node.js instalado, execute `node --test tests/recognition.test.cjs`. Verifica a correspondência entre mira e recorte para vídeos horizontais e verticais, a seleção da previsão, as traduções e o formato do identificador do modelo. Os testes não substituem os ensaios com câmara e modelo reais.

## Referências

- Integração oficial no browser: <https://docs.roboflow.com/deployment/self-hosted/sdks/web-browser/inferencejs>
- Referência do SDK: <https://docs.roboflow.com/deployment/self-hosted/sdks/web-browser/inferencejs-reference>
- Permissões e contexto seguro da câmara: <https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia>

## Próximo passo de validação

Experimentar os materiais disponíveis na escola, com diferentes fundos, iluminações e distâncias, em computador, Android e iPhone. Registar as confusões entre categorias e os objetos que faltam antes de decidir manter, substituir ou treinar um modelo específico.
