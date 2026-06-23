# Wake Quartermaster (WOL)

Webapp déployée sur **apps** pour réveiller le PC **Quatermaster** via Wake-on-LAN.

## URLs

| Accès | URL |
|-------|-----|
| LAN | http://apps:3087/ |
| Tailscale | http://100.93.92.42:3087/ |
| Health | http://apps:3087/api/health |

## Configuration PC (une fois, en admin)

Le WOL de base est activé, mais il faut finaliser la config Windows **en administrateur** :

```powershell
# PowerShell en tant qu'administrateur
C:\Users\Quatermaster\homelab\setup-wol-quartermaster.ps1
```

Ou enregistrer une tâche qui demandera UAC au prochain login :

```powershell
.\homelab\install-wol-setup-task.ps1
```

Points importants :
- **Réveil sur Magic Packet** : activé
- **WoL / Arrêt vitesse réseau** : `Pas vitesse ralentie`
- **Fast Startup** : désactivé par le script
- **BIOS** : Wake-on-LAN activé, ErP/Eco désactivé si la carte s'éteint

## Cursor Agent worker au démarrage

```powershell
.\homelab\install-cursor-agent-autostart.ps1
```

Crée un raccourci dans le dossier Démarrage Windows et lance `agent worker start` pour **My Machines**.

## Déploiement apps

```powershell
C:\workspace\Apps-server\provision\deploy-wake-quartermaster.ps1
```

Envoie les paquets WOL depuis :
1. **Docker/WSL** (UDP broadcast + unicast, 30 paquets)
2. **Windows apps** (helper sur port 3088, 30 paquets supplémentaires)

## Cible WOL

| Paramètre | Valeur |
|-----------|--------|
| MAC | `18:C0:4D:A9:10:3A` |
| Broadcast | `192.168.1.255` |
| IP LAN | `192.168.1.158` |

## Test

1. **Arrêt complet** (pas veille) : `shutdown /s /t 0`
2. Ouvrir http://apps:3087/ et cliquer **Réveiller le PC**
3. Attendre 30–60 secondes
