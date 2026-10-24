# EV Fleet Management System (FMS) 🚗⚡

**EV Fleet Management System** is a B2B web-based application designed to streamline and optimize business fleet operations for electric vehicles (EVs). The system assists fleet managers in monitoring vehicle state of charge (SoC) and allocating routes, while supporting drivers with charger navigation and incident reporting.

---

## 🌟 Key Features

### 🏢 Manager Panel
* **Battery & Fleet Monitoring:** Real-time visibility into vehicle availability and State of Charge (SoC).
* **Smart Vehicle Assignment:** Automated car selection based on current charge levels and operational requirements.
* **Route Optimization Algorithm:** Route assignment considering battery degradation, temperature, weather conditions, and required range.
* **Fleet Analytics:** Performance and operational reporting.

### 🚗 Driver View
* **EV Charger Finder:** Nearby charging station search using spatial data.
* **Direct Navigation Link:** One-click redirection to Google Maps for turn-by-turn navigation.
* **Incident Reporting:** Quick damage/incident submission with photo upload and issue description.

---

## 🛠️ Tech Stack & Architecture

* **Backend:** Java, Spring Boot, Spring Security (JWT)
* **Database:** PostgreSQL with **PostGIS** extension (spatial queries)
* **Frontend:** React (Single Page Application)
* **External APIs:** OpenChargeMap / OpenStreetMap API, Weather API, Google Maps URL Scheme
* **Infrastructure:** Docker & Docker Compose

---

## 🎓 Academic Context

This repository contains the source code and documentation for the Engineering Thesis:
**"System zarządzania flotą pojazdów elektrycznych"** (*EV Fleet Management System*).
