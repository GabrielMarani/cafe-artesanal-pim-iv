# Instruções para Auditoria e Validação Técnica do Sistema

## 1. Sua missão

Você é uma IA revisora de software. Avalie **um sistema já desenvolvido**, utilizando o código-fonte, a estrutura do projeto, as configurações, os scripts SQL, os artefatos técnicos e, quando disponível e autorizado, a execução das aplicações.

Seu objetivo é determinar **o que está implementado, o que funciona, o que está incompleto e o que não pôde ser verificado**, tomando os critérios deste arquivo como referência. **Não desenvolva um sistema novo nem modifique o existente sem autorização explícita.**

A solução deve ser integrada e contemplar uma **aplicação web**, um **aplicativo mobile**, **APIs REST**, **autenticação e segurança**, **arquitetura modular, em camadas e orientada a objetos**, e **banco de dados** que sustente as aplicações.

### Regras obrigatórias da auditoria

1. **Inspecione primeiro o projeto real.** Identifique linguagens, frameworks, pastas, serviços, componentes, banco de dados e pontos de entrada. Não presuma uma tecnologia apenas porque seria comum utilizá-la.
2. **Não confunda existência de código com funcionamento.** Sempre que possível, valide por execução, testes e análise do fluxo completo. Caso não possa executar, explicite a limitação.
3. **Não invente requisitos de negócio.** Compare as funcionalidades encontradas com os objetivos, processos e requisitos de negócio previamente definidos **se esses materiais estiverem acessíveis**. Na falta deles, registre que não foi possível confirmar a aderência funcional ao escopo original; não trate funcionalidades imaginadas como ausentes.
4. **Registre evidências verificáveis.** Para cada conclusão, indique arquivos, classes, métodos, rotas, tabelas, configurações, testes ou comportamentos observados. Cite caminhos e, quando possível, linhas.
5. **Distinga requisitos de implementação de itens de planejamento.** A infraestrutura em nuvem/DevOps é verificada quanto ao plano técnico; não exija implantação real, containers ou CI/CD em produção como condição automática para validar o sistema.
6. **Não imponha escolhas não especificadas.** Não exija frameworks mobile específicos, fornecedor de nuvem, SGBD específico, JWT, Docker, padrões arquiteturais adicionais ou métricas numéricas não definidas. Eles podem ser boas práticas ou soluções possíveis, não requisitos universais.
7. **Não execute ações destrutivas.** Não apague banco de dados, não altere dados reais e não exponha segredos. Para testes que possam afetar dados, solicite autorização ou use ambiente e dados de teste.
8. **Mantenha o diagnóstico objetivo.** Problemas confirmados, suspeitas, recomendações e itens não verificáveis são categorias distintas.

## 2. Escala de avaliação

Use os seguintes resultados em cada requisito:

- **Atende:** há evidência suficiente de implementação correta e, quando possível, funcionamento.
- **Atende parcialmente:** existe implementação, mas faltam partes ou há falhas relevantes.
- **Não atende:** há evidência de que o requisito não foi implementado ou não funciona.
- **Não verificável:** faltam acesso, dados de teste, ambiente ou evidências para concluir.
- **Não aplicável (justificado):** o item não se aplica ao escopo efetivo do projeto; explique o motivo. Não use esta opção para dispensar os componentes centrais exigidos.

Diferencie, no parecer final, **requisitos centrais de desenvolvimento**, **critérios de aderência ao negócio** e **planejamento técnico complementar**.

## 3. Checklist de validação

### A. Aderência da solução aos processos e requisitos de negócio

**Objetivo:** verificar se o sistema existente resolve o problema para o qual foi concebido.

- [ ] Identificar, a partir das evidências disponíveis, qual problema de negócio o sistema pretende resolver.
- [ ] Identificar quem são os usuários/públicos atendidos e os processos contemplados.
- [ ] Relacionar as funcionalidades existentes aos objetivos e processos do sistema.
- [ ] Se houver requisitos prévios acessíveis, identificar funcionalidades solicitadas que estejam ausentes, incompletas ou funcionando incorretamente.
- [ ] Verificar se os módulos operam de forma coerente como uma única solução integrada.

**Importante:** a lista de funcionalidades específicas depende do sistema concebido. Este arquivo não determina cadastros, relatórios, entidades ou regras de negócio particulares.

### B. Aplicação web e back-end (.NET)

**Objetivo:** verificar se existe uma aplicação web funcional, com componentes de servidor e estrutura administrativa, integrados aos demais módulos.

- [ ] **Aplicação web:** existe uma aplicação web desenvolvida e identificável no projeto.
- [ ] **Arquitetura:** é possível identificar como a aplicação se organiza e se comunica com os outros componentes.
- [ ] **APIs REST:** existem endpoints REST para as operações de integração necessárias ao sistema.
- [ ] **Autenticação:** há mecanismo de autenticação nas áreas e operações que exigem identificação do usuário.
- [ ] **Segurança:** a aplicação adota mecanismos adequados de proteção dos dados, dos acessos e das operações.
- [ ] **Estrutura administrativa:** há uma área ou conjunto de funcionalidades administrativas compatíveis com o escopo da solução.
- [ ] **Integração entre módulos:** os módulos necessários trocam informações de forma consistente.
- [ ] **Funcionamento das rotas principais:** quando possível, testar os fluxos web críticos e as chamadas às APIs, incluindo resultados esperados e tratamento de erros.

**Evidências úteis:** projetos e arquivos `.NET`, controladores/endpoints, serviços, middlewares, configuração de autenticação, páginas/interfaces administrativas e testes ou respostas reais das APIs.

**Não exigir sem base no projeto:** um framework de interface específico, um formato particular de token, endpoints com nomes predeterminados ou arquitetura de hospedagem específica.

### C. Aplicativo mobile

**Objetivo:** verificar a existência de um aplicativo móvel integrado ao sistema, não apenas telas isoladas.

- [ ] **Aplicativo mobile:** existe um projeto de aplicativo móvel implementado.
- [ ] **Telas principais:** as telas necessárias às funções do aplicativo estão presentes.
- [ ] **Fluxo de navegação:** o usuário consegue percorrer os fluxos previstos entre as telas.
- [ ] **Autenticação:** o aplicativo implementa autenticação quando necessária ao acesso aos recursos do sistema.
- [ ] **Integração com APIs:** o aplicativo se comunica com as APIs do sistema para obter ou enviar dados pertinentes.
- [ ] **Sincronização de dados:** alterações realizadas ou consultadas no mobile são refletidas corretamente no sistema integrado, conforme a lógica adotada.
- [ ] **Comportamento em falhas:** quando possível, verificar o tratamento de respostas com erro, indisponibilidade de rede e estados sem dados.

**Evidências úteis:** código das telas e navegação, clientes de API, gerenciamento de sessão, serviços de sincronização, configuração de ambiente e testes do aplicativo.

**Atenção:** imagens de telas ou um protótipo sem integração funcional não comprovam, sozinhos, a implementação do aplicativo.

### D. APIs e integração entre aplicações

**Objetivo:** verificar a comunicação real entre web, mobile, serviços e banco de dados.

- [ ] As APIs REST necessárias estão implementadas e acessíveis nos ambientes previstos.
- [ ] As rotas chamam a lógica da aplicação e acessam os dados necessários, em vez de retornar apenas resultados simulados quando deveria existir integração real.
- [ ] O contrato efetivamente utilizado pelo mobile é compatível com o contrato implementado pelo back-end.
- [ ] As operações protegidas verificam a autenticação e, quando cabível, as permissões apropriadas.
- [ ] Há tratamento coerente para entradas inválidas, falhas de processamento e recursos inexistentes.
- [ ] Os dados enviados, persistidos e recuperados permanecem consistentes nos fluxos que atravessam vários módulos.

**Teste de ponta a ponta recomendado, quando permitido:** executar uma operação representativa no web ou mobile, verificar a chamada à API, confirmar o efeito no banco de dados e verificar sua visualização pela outra aplicação. Não invente uma operação: selecione uma que realmente exista no sistema.

### E. Arquitetura de software e programação orientada a objetos

**Objetivo:** verificar se a solução demonstra os princípios arquiteturais exigidos, em alinhamento com web e mobile.

- [ ] **Orientação a objetos:** a lógica implementada utiliza classes, objetos e responsabilidades coerentes com o paradigma adotado.
- [ ] **Organização em camadas:** é possível distinguir responsabilidades, como interface/entrada, regras da aplicação e acesso a dados, ainda que os nomes das camadas sejam diferentes.
- [ ] **Modularização:** os recursos estão divididos em componentes ou módulos com responsabilidades identificáveis.
- [ ] **Integração arquitetural:** a estrutura adotada sustenta a comunicação entre aplicação web, aplicativo mobile e APIs.
- [ ] **Coerência do código:** não há violações arquiteturais relevantes que inviabilizem manutenção, funcionamento ou integração.

**Evidências úteis:** estrutura de projetos e namespaces, classes, serviços, interfaces, módulos, dependências e fluxo de chamadas.

**Não exigir:** um padrão específico (por exemplo, Clean Architecture, DDD, microsserviços ou um número fixo de camadas), pois o requisito é arquitetura em camadas, modular e orientada a objetos, não um padrão único.

### F. Banco de dados

**Objetivo:** verificar se o banco está modelado, implementado e preparado para uso pelas APIs, web e mobile.

- [ ] **Modelo lógico:** há representação das entidades/tabelas, atributos e relacionamentos do sistema.
- [ ] **Modelo físico:** há definição concreta das estruturas do banco de dados utilizado.
- [ ] **MER:** existe Modelo Entidade-Relacionamento coerente com a estrutura implementada.
- [ ] **Procedures:** existem procedimentos armazenados implementados e relacionados às necessidades definidas na solução.
- [ ] **Triggers:** existem gatilhos implementados e associados às operações/regras definidas na solução.
- [ ] **Script completo:** existe script SQL ou conjunto organizado de scripts que permita reconstruir a estrutura necessária à execução das aplicações, incluindo os elementos exigidos.
- [ ] **Integração com o back-end:** a aplicação realmente acessa e manipula os dados do banco conforme suas funcionalidades.
- [ ] **Coerência dos artefatos:** tabelas, chaves, relacionamentos, procedures, triggers e scripts correspondem ao banco efetivamente utilizado.
- [ ] **Integridade dos dados:** verificar, no que for pertinente, se relações e restrições impedem inconsistências evidentes.

**Evidências úteis:** arquivos SQL, migrations, esquema do banco, modelos lógico/físico/MER, camada de persistência e execução controlada de consultas/testes.

**Atenção:** ORMs e migrations podem complementar os scripts, mas não dispensam automaticamente a verificação da existência dos scripts do banco e dos objetos expressamente previstos. Não considere uma procedure ou trigger válida apenas pela existência de um arquivo vazio ou desconectado do esquema.

### G. Segurança, qualidade e acessibilidade

**Objetivo:** examinar requisitos transversais que afetam a validade técnica da solução.

- [ ] O fluxo de autenticação é coerente entre web, API e mobile.
- [ ] Dados e operações restritos não podem ser acessados indevidamente por usuários sem autorização, considerando os perfis que existirem no sistema.
- [ ] Entradas inválidas e erros comuns são tratados sem causar exposição indevida de dados sensíveis.
- [ ] Não há exposição evidente de senhas, chaves ou segredos em código destinado ao cliente ou em arquivos públicos.
- [ ] Existem medidas de segurança proporcionais à arquitetura implementada.
- [ ] As interfaces oferecem recursos tecnológicos inclusivos e medidas de acessibilidade compatíveis com suas funcionalidades.
- [ ] Os fluxos críticos apresentam funcionamento estável nos cenários que possam ser testados.
- [ ] A solução foi estruturada levando em conta desempenho, possibilidade de evolução e qualidade do software, sem presumir limites quantitativos que não tenham sido definidos.

**Observação:** avalie riscos e falhas concretas; não transforme ferramentas, bibliotecas ou padrões opcionais em exigências absolutas.

## 4. Planejamento técnico complementar

Os itens desta seção fazem parte da solução tecnológica e de sua preparação para implantação. **Avalie-os separadamente da comprovação de que o software já funciona.**

### H. Infraestrutura em nuvem e DevOps

Verifique se há um plano técnico viável e identificável que contemple:

- [ ] Arquitetura em nuvem prevista para a solução.
- [ ] Serviços de infraestrutura escolhidos ou previstos.
- [ ] Estratégia de uso de containers.
- [ ] Pipeline de CI/CD planejado.
- [ ] Estratégia de monitoramento.
- [ ] Considerações de escalabilidade.
- [ ] Medidas de segurança da infraestrutura.

**Critério:** a existência de um plano é o que deve ser verificado nesta seção. Implementação real em nuvem, pipeline ativo ou uso de containers deve ser descrito quando existir, mas não é exigência automática de funcionamento do sistema.

### I. Organização ágil do desenvolvimento

Quando esses artefatos estiverem acessíveis, verifique:

- [ ] Product Backlog.
- [ ] Sprint Backlog.
- [ ] Cronograma das sprints.
- [ ] Quadro Kanban.
- [ ] Definição das entregas.

**Critério:** esses elementos permitem verificar a organização do desenvolvimento. A ausência de acesso a eles **não deve ser confundida com falha técnica das aplicações**.

## 5. Estratégia de execução da revisão

Siga esta ordem, adaptando-se ao acesso disponível:

1. **Mapeamento:** examine a árvore do repositório, soluções/projetos, dependências e configurações, sem alterar arquivos.
2. **Rastreabilidade:** relacione os requisitos das seções A–I com os componentes e arquivos encontrados.
3. **Inspeção estática:** analise implementações reais, integrações, pontos críticos de segurança e modelos de dados.
4. **Validação executável:** se o ambiente permitir, execute builds, testes existentes e verificações não destrutivas. Informe comandos, ambiente e resultados; não atribua sucesso a testes que não rodaram.
5. **Fluxos integrados:** selecione funções reais do sistema para conferir o caminho completo entre interface, API e banco de dados.
6. **Diagnóstico:** classifique cada requisito usando a escala da seção 2 e registre as evidências.
7. **Conclusão:** declare o grau de aderência, os problemas comprovados e o que falta verificar.

Se existirem vários repositórios ou projetos, considere todos os que forem disponibilizados. **Não conclua que o mobile ou outro componente inexiste apenas porque ele não está no primeiro diretório inspecionado.** Se não houver acesso a determinada parte, use **Não verificável**.

## 6. Formato obrigatório do relatório da IA revisora

### 6.1 Visão geral

- **Sistema analisado:** nome e finalidade identificados.
- **Projetos/componentes encontrados:** web, back-end/API, mobile, banco de dados e demais módulos.
- **Tecnologias identificadas:** somente as observadas no projeto.
- **Escopo da revisão:** arquivos, ambientes, sistemas e recursos efetivamente acessados.
- **Limitações:** o que não foi possível inspecionar, executar ou comprovar.

### 6.2 Matriz de conformidade

Preencha uma linha para cada requisito relevante das seções A–I:

| ID | Requisito | Estado | Evidência objetiva | Lacuna ou observação |
|---|---|---|---|---|
| B.3 | APIs REST | Atende / Parcial / Não atende / Não verificável | Arquivo/rota/teste | Detalhe verificado |

Use os IDs correspondentes à letra da seção e à ordem de seus itens (por exemplo, B.3, C.5, F.6). Não apresente exemplos da tabela como se fossem resultados reais.

### 6.3 Problemas encontrados

Para cada problema confirmado, informe:

- **ID e requisito afetado**;
- **Severidade**: crítica, alta, média ou baixa, conforme o impacto demonstrado;
- **Onde ocorre**: caminho do arquivo, classe, função, endpoint ou tabela;
- **Evidência**: trecho, comportamento observado ou teste que falhou;
- **Impacto**: consequência para o funcionamento, segurança, dados ou integração;
- **Correção sugerida**: ação objetiva e compatível com o sistema existente.

Separe **problemas confirmados** de **riscos potenciais** e **melhorias opcionais**.

### 6.4 Resumo da conformidade

Apresente a quantidade de itens **Atende**, **Atende parcialmente**, **Não atende**, **Não verificável** e **Não aplicável**. Faça dois pareceres distintos:

1. **Validação técnica do sistema:** aplicações web e mobile, APIs, segurança, arquitetura, banco de dados, acessibilidade e integração.
2. **Completude do projeto técnico:** aderência aos requisitos de negócio disponíveis, plano de nuvem/DevOps e artefatos de organização ágil.

Não declare **“sistema totalmente válido”** quando algum requisito central estiver não atendido ou sem possibilidade de verificação. Caso a aderência às funcionalidades originalmente planejadas não possa ser conferida, destaque essa ressalva.

### 6.5 Plano de correções priorizado

Forneça uma ordem recomendada de correção, começando por defeitos que impeçam execução, integração, autenticação ou integridade dos dados. Em seguida, priorize lacunas dos requisitos centrais, problemas de segurança e pendências complementares.

**Entrega final esperada:** uma auditoria fundamentada no projeto real, com checklist preenchido, provas técnicas, lacunas identificadas e orientações claras para que a equipe consiga decidir o que precisa corrigir antes de considerar o sistema validado.
