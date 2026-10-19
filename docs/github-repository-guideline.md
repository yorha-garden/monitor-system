# Github Repository Guideline

## 1. Commit Frequency & Granularity

### Prinsip Utama

Commit harus:

* **Kecil & fokus, 5-100 lines**
* **Merepresentasikan 1 logical change**
* **Mudah di-review & di-revert**

### Frekuensi Commit

**Ideal:**

* Commit setiap **15–60 menit** saat aktif coding
* Atau setiap:
  * 1 function selesai
  * 1 bug fixed
  * 1 logical step selesai

**Rule of thumb:**

Kalau kamu pause kerja, harusnya bisa commit dulu.

### Granularity (Ukuran Commit)

**Good commit:**

* 1 concern saja
* Bisa dijelaskan dalam 1 kalimat
* Tidak campur:
  * refactor + feature
  * fix + formatting

**Contoh bagus:**

feat: add login API integration  
fix: handle empty email validation  
refactor: extract auth service

**Contoh buruk:**

update code  
fix bugs  
final fix beneran

### Hindari

* Commit besar (1000+ lines, banyak file, banyak concern)
* Commit “WIP” ke branch shared
* Commit hasil “panic coding” tanpa cleanup
* Banyak perubahan tanpa intermediate commit

## 2. Commit Guidelines

Use **conventional commits**: <https://www.conventionalcommits.org/>

`type(scope): description`

Examples:

Common types:

* `feat` – new feature
* `fix` – bug fix
* `refactor` – code restructuring
* `docs` – documentation updates
* `chore` – maintenance tasks 
* `test` – testing 

Breaking changes should be marked:

`feat(api)!: change response format`

**Contoh:**

`feat: add payment gateway integration`

`fix: handle null response on login API`

`refactor: simplify auth middleware`

**Optional scope:**

feat(auth): add JWT refresh token

### Before commit:

* All tests must pass
* Add new tests when introducing features
* Ensure no lint errors
* Validate functionality locally

Testing ensures that reviewers focus on **design and correctness rather than basic failures**.

## 3. Branching Strategy

Gunakan model Trunk Based: <https://trunkbaseddevelopment.com/>

### Main branches

* `main` → production-ready, siap rilis kapanpun, 
* `release` → current production version

Tidak ada branch `develop`, `staging`, atau semacamnya

### Naming branch:

Sesuai perubahan yang dilakukan

`feature/<short-description>`  
`fix/<bug-description>`  
`chore/<maintenance>`

Contoh:

`feature/payment-integration`  
`fix/login-validation-error`

**Rules:**

* Dilarang commit langsung ke `main`, kecuali emergency/incident yg membutuhkan hotfix
* Semua perubahan harus lewat branch dan Pull Request (PR)

## 4. Documentation Standard

### README wajib ada:

* Project overview
* Tech stack
* Setup & run
* Environment variables
* Deployment (optional)

### Docs tambahan:

* Architecture diagram
* API spec
* Decision log (ADR)

## 5. Security Best Practices

Jangan commit:

* `.env`
* API keys
* Log