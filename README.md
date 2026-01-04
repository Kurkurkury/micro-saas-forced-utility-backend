\# micro-saas-zwangsnutzen (Backend)



Minimaler Job-Heartbeat-Service:

\- Jobs pingen regelmäßig → Backend speichert Runs in Postgres

\- Heartbeat-Checker prüft Overdue/No-Run

\- Public Status + Badge via Share-Token

\- Admin-API für JobConfigs + ApiKeys (revocable)



---



\## Setup



\### 1) Install

```bash

npm install



