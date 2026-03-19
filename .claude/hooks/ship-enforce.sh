#!/bin/bash
# Ship 워크플로우 강제 hook
#
# .claude/settings.json에서 설정:
# {
#   "hooks": {
#     "PreToolUse": [{
#       "matcher": "Write|Edit",
#       "hooks": [{
#         "type": "command",
#         "command": ".claude/hooks/ship-enforce.sh prewrite"
#       }]
#     }],
#     "SubagentStop": [{
#       "matcher": "",
#       "hooks": [{
#         "type": "command",
#         "command": ".claude/hooks/ship-enforce.sh subagent-stop"
#       }]
#     }]
#   }
# }

case "$1" in
  prewrite)
    # 오케스트레이터가 직접 파일 수정 시도 시 차단
    # (allowed-tools로도 제어되지만 이중 안전장치)
    if [ "$CLAUDE_AGENT" = "ship-orchestrator" ]; then
      echo "BLOCK: ship-orchestrator는 직접 파일을 수정할 수 없습니다."
      exit 1
    fi
    ;;
  subagent-stop)
    # implementer 종료 시 커밋 존재 확인
    if [ "$CLAUDE_AGENT" = "implementer" ]; then
      COMMITS=$(git log --oneline -1 2>/dev/null)
      if [ -z "$COMMITS" ]; then
        echo "WARNING: implementer가 커밋 없이 종료되었습니다."
      fi
    fi
    ;;
esac
