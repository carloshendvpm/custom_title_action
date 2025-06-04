## 📌 O que este PR faz

Este PR implementa a automação da geração de títulos de Pull Requests utilizando a API Gemini. A ideia é gerar um título curto e descritivo com base nas mensagens de commit, seguindo o padrão de Conventional Commits.

## ⚙️ Como funciona

- Ao adicionar a label `generate-title` em um PR, a GitHub Action é acionada.
- A Action coleta todas as mensagens de commit do PR.
- Envia essas mensagens para a API Gemini, solicitando um título curto no padrão convencional.
- Atualiza automaticamente o título do PR com o valor retornado.

## 🧪 Como testar

1. Crie um PR com commits relevantes.
2. Adicione a label `generate-title`.
3. Verifique se o título do PR foi atualizado automaticamente.

## ✅ Checklist

- [x] GitHub Action configurada com trigger por label
- [x] Integração com a API Gemini
- [x] Geração automática de título
- [x] Uso de Conventional Commits

## 🚀 Próximas features
- [ ] Links automáticos de CLICKUP-ID com base no nome da branch.
