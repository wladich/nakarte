Source code of site http://nakarte.me (former http://nakarte.tk)

Install locally for development

```bash
git clone git://github.com/wladich/nakarte
cd nakarte
npm install
```

Run dev server:
```bash
npm start
```

Check code for errors:
```bash
npm run lint
```

Some features require keys stored in src/secrets.js. 
In repository those keys are replaced with dummy ones.
    
Some of server side components:
https://github.com/wladich/westra_passes_for_nakarte
https://github.com/wladich/ElevationServer
