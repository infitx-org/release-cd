#! /bin/bash

kubectl config set-credentials default-user --token="$(cat /run/secrets/kubernetes.io/serviceaccount/token)"
kubectl config set-cluster default-cluster --server="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT_HTTPS}" --certificate-authority=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
kubectl config set-context default-context --cluster=default-cluster --user=default-user --namespace="$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)"
kubectl config use-context default-context
