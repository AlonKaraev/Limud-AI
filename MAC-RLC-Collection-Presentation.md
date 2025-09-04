# MAC-RLC Collection

## Slide 1: Title
**MAC-RLC Collection**

---

## Slide 2: General Overview

This tool captures, correlates and visualizes LTE downlink and Uplink control information with PHY layer feedback to monitor across multiple cells in single carrier and carrier aggregation scenarios:

• MAC scheduling decisions
• Resource allocation  
• Data & error rates
• HARQ

---

## Slide 3: Overview Flow

The tool is split to 4 stages:

• **User Interface Interaction & Request Initiation** (PWGUI&PWCFG→CFGMGR→OAMMGR)
• **System Processing and Collection Flow** (OAMMGR→ CollectionScript →CFGMGR)  
• **S3 Uploading, Storing, processing and enrichment** (CFGMGR→MACRLC-Consumer→ MacRLC-Processor→Logstash→Elastic)
• **Visualization** (Kibana)

---

## Slide 4: Logging Cheat Sheet

| Execute in | Debug | Command |
|------------|-------|---------|
| vNode Pod | Bin File Collection, Trigger, Compression and Upload | `tail -f /var/log/messages \| grep MAC_RLC` |
| SMO Admin-Server | Upload to S3 and extraction | `kubectl -n pw logs -f macrlc-consumer-XXXX-XXXX` |
| SMO Admin-Server | Parsing bin files to metrics and enrichment | `kubectl -n pw logs -f macrlc-processor-xxxx-xxxx` |
| SMO Admin-Server | Upload to Elastic Queue | `kubectl -n pw logs -f logstash-xxxx-xxxx` |

---

## Slide 5: User Interface Interaction & Request Initiation
*[Contains screenshot/diagram]*

---

## Slide 6: System Processing and Collection Flow  
*[Contains screenshots/diagrams]*

---

## Slide 7: S3 Uploading, Storing, processing and enrichment
*[Contains screenshot/diagram]*

---

## Slide 8: S3 Uploading, Storing, processing and enrichment (continued)
*[Contains screenshot/diagram]*

---

## Slide 9: Demo
*[Demo slide]*

---

## Slide 10: Contribution

**Team Contributors:**
• **PWGUI & PWCFG**: Vishal & Pranit
• **PWINSIGHT**: Vivek & Ajinkya  
• **OAMMGR & CFGMGR**: Uma
• **Stack**: Vaibhav
• **Planning & Oversight**: Nadav K
• **First POC and Dashboarding**: Itai M
• **MPA**: Suresh

---

## Slide 11: Thank you

**Thank you**
