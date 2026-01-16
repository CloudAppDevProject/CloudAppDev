{{/*
Expand the name of the chart.
*/}}
{{- define "cloudappdev.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "cloudappdev.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cloudappdev.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloudappdev.labels" -}}
helm.sh/chart: {{ include "cloudappdev.chart" . }}
{{ include "cloudappdev.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cloudappdev.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloudappdev.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Global namespace helper
*/}}
{{- define "cloudappdev.namespace" -}}
{{- default "default" .Values.global.namespace }}
{{- end }}

{{/*
Global environment helper
*/}}
{{- define "cloudappdev.environment" -}}
{{- default "dev" .Values.global.environment }}
{{- end }}

{{/*
Global domain helper
*/}}
{{- define "cloudappdev.domain" -}}
{{- default "dev.cloudappdev.site" .Values.global.domain }}
{{- end }}
