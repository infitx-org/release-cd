#! /bin/bash

# run a tool based on the first argument
case "$1" in
  k9s)
    ./kube-config.sh
    shift
    k9s "$@"
    ;;
  mc)
    shift
    mc "$@"
    ;;
  code)
    shift
    code "$@"
    ;;
  node)
    shift
    node "$@"
    ;;
  *)
    echo "Usage: $0 {k9s|mc|code|node} [args...]"
    exit 1
    ;;
esac
