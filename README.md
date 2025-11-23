# Yettel_zadatak
Projektni zadatak za Yettel - API backend 

---

## Pokretanje projekta

### Instalacija
```bash
  npm install
```

### Kreiranje .env fajla

PORT=3001  
JWT_SECRET=tajna    
*Za lokalno pokretanje:*  
DATABASE_STORAGE=./data.sqlite   
*Za Docker (automatski se menja):*      
DATABASE_STORAGE=/usr/src/app/data/database.sqlite


### Pokretanje

```bash 
    npm start
```
Servis će biti pokrenut na localhost-u, port 3001

## Testiranje

### Pokretanje testova

Pokretanje testova se vrši tako što se pokreće fajl api.e2e.test.js koji se nalazi u folderu ''tests'' u root-u projekta 


## Docker

### Pokretanje prvi put

```bash
    docker compose up --build
```
### Svako sledece pokretanje
```bash
    docker compose up
```
### Gašenje docker-a
```bash
    docker compose down
```

### Notes

1. Admin je jedini kreiran po default-u.   
```text
    ADMIN:
    username: admin   
    password: admin123
```
2. Prilikom testiranja ruta preko Postman-a, nakon login-a, bitno je da se sačuva token koji se vraća u reposnse-u jer većina ostalih ruta zahteva da se prosledi token u header-u request-a. 


### API dokumentacija

API dokumentacija je kreirana preko swagger alata.     
Da bi pristupili potrebno je lokalno pokrenuti sa:    
```bash
    npm start
```
Potom pristupiti:
```text
 localhost:3001/api-docs/
```

### Postman exported JSON

Nalazi se u direktorijumu "Postman" u root-u projekta