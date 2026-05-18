

{{- if .Values.routing.enabled -}}
{{- if not (or (eq .Values.routing.type "ingress") (eq .Values.routing.type "gateway")) -}}
{{- fail (printf "\n\nERROR: .Values.routing.type must be either 'ingress' or 'gateway'. Got: '%s'" .Values.routing.type) -}}
{{- end -}}
{{- end -}}

{{- define "app.issuer_name" -}}
{{- if .Values.client_issuer.pre_existing -}}
{{- .Values.client_issuer.name -}}
{{- else -}}
{{- printf "%s-issuer" .Release.Name -}}
{{- end -}}
{{- end -}}

{{- define "app.issuer_kind" -}}
{{- if .Values.client_issuer.pre_existing -}}
{{- .Values.client_issuer.kind -}}
{{- else -}}
{{- "Issuer" -}}
{{- end -}}
{{- end -}}
