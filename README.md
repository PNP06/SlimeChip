# SlimeChip

Jeu tactile de slime jouable dans un navigateur mobile ou desktop. Il fonctionne sans dependance, sans build et sans image externe.

## Lancer en local

Ouvrir `index.html` dans un navigateur moderne.

Pour un test plus realiste sur mobile, servir le dossier localement :

```bash
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Controles

- **Malaxer** : pression et deformation douce.
- **Etirer** : effet elastique avec grands gestes ou deux doigts.
- **Percer** : eclate les bulles.
- **Tourbillon** : melange visuel des couleurs.
- **Paillettes** : ajoute des particules brillantes.
- **Parametres** : bouton engrenage en haut a droite pour regler mode, couleur, elasticite, bulles, brillance et inclusions.

## Notes techniques

- Canvas HTML5 plein ecran avec `PointerEvent`, compatible tactile/souris.
- Retour haptique si le navigateur et le telephone le supportent.
- Audio genere par Web Audio API apres interaction utilisateur.
- Aucun tracking, aucune donnee stockee.
