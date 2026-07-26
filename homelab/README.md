# Power Quatermaster (Wake + Sleep)

Webapp déployée sur **apps** pour :

1. **Réveiller** Quatermaster via Wake-on-LAN
2. **Mettre en veille** Quatermaster via un agent local (port 3089)

## URLs

| Accès | URL |
|-------|-----|
| LAN | http://apps:3087/ |
| Tailscale | http://100.93.92.42:3087/ |
| Health | http://apps:3087/api/health |
| Status | http://apps:3087/api/status |

## Architecture

```
Phone/PC  →  apps:3087 (Docker)
               ├─ POST /api/wake   → magic packets UDP (+ helper Windows :3088)
               └─ POST /api/sleep  → Quatermaster:3089/sleep (pc-power-agent)
```

Wake ne peut **pas** fonctionner sans config Windows/BIOS. Sleep nécessite l’agent local allumé.

## 1) Config Windows WOL (admin, une fois)

Le WOL est partiellement activé, mais **`WoL / Arrêt vitesse réseau`** doit être
`Pas vitesse ralentie` (sinon le réveil échoue souvent).

```powershell
# PowerShell en tant qu'administrateur
C:\Users\Quatermaster\homelab\setup-wol-quartermaster.ps1
```

Ou enregistrer une tâche UAC au prochain login :

```powershell
.\homelab\install-wol-setup-task.ps1
```

Points importants :
- **Réveil sur Magic Packet** : Activé
- **WoL / Arrêt vitesse réseau** : `Pas vitesse ralentie` (critique)
- **Fast Startup** : désactivé par le script
- **BIOS** : Wake-on-LAN activé, **ErP / Deep Sleep désactivé**

### BIOS (si wake reste mort)

1. Activer **Wake-on-LAN** / **PCIE Wake** / **Power On By PCI-E**
2. Désactiver **ErP** / **ERP Ready** / **Deep Sleep** / **Ultra Low Power**
3. Garder l’alimentation standby NIC (+5VSB) après extinction

## 2) Agent sommeil local (une fois)

```powershell
.\homelab\install-pc-power-agent.ps1
# Recommandé une fois en admin (règle firewall TCP 3089) :
Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\Users\Quatermaster\homelab\install-pc-power-agent.ps1'
```

Endpoints locaux :

| Méthode | URL | Effet |
|---------|-----|-------|
| GET | http://192.168.1.158:3089/health | health |
| GET | http://192.168.1.158:3089/status | état + NIC |
| POST | http://192.168.1.158:3089/sleep | veille S3 |
| POST | http://192.168.1.158:3089/hibernate | hibernation |

## 3) Déploiement apps

```powershell
# Source tracked in this repo → sync to Apps-server template, then deploy
Copy-Item -Recurse -Force C:\Users\Quatermaster\homelab\wake-quartermaster\* C:\workspace\Apps-server\templates\wake-quartermaster\
Copy-Item -Force C:\Users\Quatermaster\homelab\setup-wol-quartermaster.ps1 C:\workspace\Apps-server\provision\setup-wol-quartermaster.ps1
C:\workspace\Apps-server\provision\deploy-wake-quartermaster.ps1
```

## Cible

| Paramètre | Valeur |
|-----------|--------|
| MAC | `18:C0:4D:A9:10:3A` |
| Broadcast | `192.168.1.255` |
| IP LAN | `192.168.1.158` |
| Sleep agent | `http://192.168.1.158:3089` |

## Test

1. **Sleep** : ouvrir http://apps:3087/ → **Mettre en veille**
2. **Wake** : http://apps:3087/ → **Réveiller le PC** (attendre 30–60 s)
3. Si wake échoue après setup Windows : changer les options BIOS ci-dessus
