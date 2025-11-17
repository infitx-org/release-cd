#! /bin/bash

# run a tool based on the first argument
# consider passing arguments
case "$1" in
  k9s)
    ./kube-config.sh
    shift
    k9s
    ;;
  mc)
    shift
    mc
    ;;
  vscode)
    shift
    code tunnel
    ;;
  node)
    shift
    node
    ;;
  *)
    shift
    bash
    ;;
esac
