# Wake Quartermaster (WOL)

Webapp déployée sur **apps** pour réveiller le PC **Quatermaster** via Wake-on-LAN.

## URLs

| Accès | URL |
|-------|-----|
| LAN | http://apps:3087/ |
| Tailscale | http://100.93.92.42:3087/ |
| Health | http://apps:3087/api/health |

## Configuration PC (une fois, en admin)

```powershell
# PowerShell en tant qu'administrateur
.\homelab\setup-wol-quartermaster.ps1
```

Vérifie aussi dans le BIOS : **Wake-on-LAN** activé, **ErP/Eco** désactivé si le NIC s'éteint en veille.

## Déploiement

Depuis `C:\workspace\Apps-server` :

```powershell
.\provision\deploy-wake-quartermaster.ps1
```

## Cible WOL

| Paramètre | Valeur |
|-----------|--------|
| MAC | `18:C0:4D:A9:10:3A` |
| Broadcast | `192.168.1.255` |
| IP LAN | `192.168.1.158` |

## Sécurité optionnelle

Définir `WAKE_TOKEN` dans `.env` sur apps pour exiger un token (`X-Wake-Token`).
