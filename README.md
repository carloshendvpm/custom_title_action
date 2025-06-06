## 📌 O que essa action faz?

Essa Action implementa a automação da geração de títulos e descrição de Pull Requests utilizando a API Gemini. A ideia é gerar títulos e descrições com base nas modificações feitas.

## ⚙️ Como funciona

- Ao adicionar uma das labels `generate-title`, `generate-description`, `generate-full-pr` em um PR, a GitHub Action é acionada.(Você também pode definir isso de forma custom através do `action.yml`).
- A Action coleta todas as mensagens de commit do PR.
- Envia essas mensagens para a API Gemini, solicitando um título e uma descrição.
- Atualiza automaticamente o título e a descrição do PR com o valor retornado.

## 🧪 Como testar

1. Crie um PR com commits relevantes.
2. Adicione uma das labels `generate-title`, `generate-description`, `generate-full-pr` ou uma das labels selecionadas por você.
3. Verifique se o título e descrição do PR foram atualizados automaticamente. 

## ✅ Checklist

- [x] GitHub Action configurada com trigger por label
- [x] Integração com a API Gemini
- [x] Geração automática de título
- [x] Uso de Conventional Commits

## 🚀 Próximas features
- [ ] Links automáticos de CLICKUP-ID com base no nome da branch.
- [x] Gerar PR descriptions automaticamente.
- [ ] Arquivos de templates custom do usuário.
