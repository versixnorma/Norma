# Estrategia de Sincronizacao Offline

## Decisao

Last-Write-Wins com timestamp e notificacao de conflito para o usuario.

## Regras

1. Acoes offline sao enfileiradas em IndexedDB com timestamp de criacao.
2. Ao reconectar, as acoes sao replayadas em ordem cronologica.
3. Se o servidor retornar `409`, a acao offline e descartada.
4. O usuario e notificado sobre conflito resolvido pelo servidor.
5. Erros `4xx/5xx` entram em retry ate `MAX_RETRIES`; apos limite, a acao e descartada.
6. Erro de rede mantem a acao na fila para nova tentativa.

## Fluxo

Offline -> Acao criada com timestamp -> IndexedDB queue  
Reconectar -> `processPendingActions()` -> Para cada acao:

- `2xx`: remover da queue.
- `409`: remover da queue e disparar evento `offline-sync-conflict`.
- `4xx/5xx`: incrementar retry.
- Network error: incrementar retry (sem remover da queue).

## Evento de Conflito

Quando um conflito e detectado, o hook emite:

- Nome: `offline-sync-conflict`
- `detail.action`: URL da acao
- `detail.message`: mensagem para UI (toast/banner)

Consumidores de UI devem escutar este evento e exibir feedback ao usuario.
