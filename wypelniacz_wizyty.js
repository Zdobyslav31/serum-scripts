// ==UserScript==
// @name         Wypelniacz_wizyty
// @namespace    PrzystanMedyczna
// @version      1.6
// @description  Wypełnij podstawowe pola wizyty w serum
// @homepageURL  https://greasyfork.org/en/scripts/462569-wypelniacz-wizyty
// @author       Jedrzej Kubala
// @match        https://serum.com.pl/dpls/rm/ex.act
// @icon         https://serum.com.pl/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const KOMORKA_ZLECAJACA_ID = 290562;
    const MIEJSCA_ZABIEGU = { gabinet: 'GZ', teren: 'DCH' };
    const COLOR_OVERRIDE = { green: 'cl-ovd-green', blue: 'cl-ovd-blue', navy: 'cl-ovd-navy', violet: 'cl-ovd-violet' }

    class Preset {
        constructor(data) {
            this.czynnosci = data.czynnosci;
            this.btn_name = data.btn_name;
            this.btn_id = data.btn_id;
            this.szablon_opisu = data.szablon_opisu;
            this.miejsce = data.miejsce;
            this.kolor = data.kolor
        }
        callback = async (e) => await wypelnij_pola(this);
    }

    const PRESETS = [
        new Preset({
            btn_id: 'nowy_btn',
            btn_name: 'Nowy pacjent opatr.',
            szablon_opisu: 'Wywiad: (pamiętaj aby najważniejsze informacje wpisać w zakładkę "Pacjent podsumowanie") \nLokalizacja i wielkość rany: \nOpis rany: \nZmiana względem ostatniej wizyty: \nPostępowanie: \nUwagi dla kolejnego dyżuru: \n',
            czynnosci: [
                { id: 14661, nazwa: 'zmiana opatrunku' },
            ],
            miejsce: MIEJSCA_ZABIEGU.gabinet
        }),
        new Preset({
            btn_id: 'opatrunek_btn',
            btn_name: 'Opatrunek',
            szablon_opisu: 'Lokalizacja i wielkość rany: \nOpis rany: \nZmiana względem ostatniej wizyty: \nPostępowanie: \nUwagi dla kolejnego dyżuru: \n',
            czynnosci: [
                { id: 14661, nazwa: 'zmiana opatrunku' },
            ],
            miejsce: MIEJSCA_ZABIEGU.gabinet,
            kolor: COLOR_OVERRIDE.violet,
        }),
        new Preset({
            btn_id: 'diagnostyka_btn',
            btn_name: 'Diagnostyka',
            szablon_opisu: 'CTK: / MmHG, HR: \nGlukoza: mg/dl\nSaturacja: SpO2\nTemperatura: °C\nEKG: ',
            czynnosci: [
                { id: 14703, nazwa: 'Pomiar ciśnienia' },
                { id: 14704, nazwa: 'Pomiar glikemii' },
                { id: 14702, nazwa: 'Saturacja' },
                { id: 14705, nazwa: 'Pomiar temperatury' },
                { id: 14662, nazwa: 'EKG' },
            ],
            miejsce: MIEJSCA_ZABIEGU.gabinet,
            kolor: COLOR_OVERRIDE.blue,
        }),
        new Preset({
            btn_id: 'wyjazdowy_btn',
            btn_name: 'Wyjazd terenowy',
            szablon_opisu: 'W badaniu: \nZgłasza następujące objawy: ',
            czynnosci: [
                { id: 23316, nazwa: 'Wyjazd terenowy' },
            ],
            miejsce: MIEJSCA_ZABIEGU.teren,
            kolor: COLOR_OVERRIDE.green,
        }),
    ]

    const BTN_STYLE = "<style>.bubbly-button,body{font-family:Helvetica,Arial,sans-serif;text-decoration:none!important}body{font-size:16px;text-align:center;background-color:#f8faff}.cl-ovd-violet{background-color: #c200ae!important;box-shadow: 0 2px 25px rgba(194,70,174,.5)!important;}.cl-ovd-navy{background-color:#174674!important;box-shadow:0 2px 25px rgba(23,70,116,.5)!important}.cl-ovd-green{background-color:#61ce70!important;box-shadow:0 2px 25px rgba(97,206,112,.5)!important}.cl-ovd-blue{background-color:#6ec1e4!important;box-shadow:0 2px 25px rgba(110,193,228,.5)!important}.bubbly-button{display:inline-block;font-size:1em;padding:1em 2em;margin-left:15px;-webkit-appearance:none;appearance:none;background-color:#ff0081;color:#fff;border-radius:4px;border:none;cursor:pointer;position:relative;transition:transform .1s ease-in,box-shadow .25s ease-in;box-shadow:0 2px 25px rgba(255,0,130,.5)}.bubbly-button:focus{outline:0}.bubbly-button:after,.bubbly-button:before{position:absolute;content:\"\";width:140%;height:100%;left:-20%;z-index:-1000;transition:.5s ease-in-out;background-repeat:no-repeat}.bubbly-button:before{display:none;top:-75%;background-image:radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,transparent 20%,#ff0081 20%,transparent 30%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,transparent 10%,#ff0081 15%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%);background-size:10% 10%,20% 20%,15% 15%,20% 20%,18% 18%,10% 10%,15% 15%,10% 10%,18% 18%}.bubbly-button:after{display:none;bottom:-75%;background-image:radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,transparent 10%,#ff0081 15%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%),radial-gradient(circle,#ff0081 20%,transparent 20%);background-size:15% 15%,20% 20%,18% 18%,20% 20%,15% 15%,10% 10%,20% 20%}.bubbly-button:active{transform:scale(.9);background-color:#e60074;box-shadow:0 2px 25px rgba(255,0,130,.2)}.bubbly-button.animate:before{display:block;animation:.75s ease-in-out forwards topBubbles}.bubbly-button.animate:after{display:block;animation:.75s ease-in-out forwards bottomBubbles}@keyframes topBubbles{0%{background-position:5% 90%,10% 90%,10% 90%,15% 90%,25% 90%,25% 90%,40% 90%,55% 90%,70% 90%}50%{background-position:0 80%,0 20%,10% 40%,20% 0,30% 30%,22% 50%,50% 50%,65% 20%,90% 30%}100%{background-position:0 70%,0 10%,10% 30%,20% -10%,30% 20%,22% 40%,50% 40%,65% 10%,90% 20%;background-size:0 0,0 0,0 0,0 0,0 0,0 0}}@keyframes bottomBubbles{0%{background-position:10% -10%,30% 10%,55% -10%,70% -10%,85% -10%,70% -10%,70% 0}50%{background-position:0 80%,20% 80%,45% 60%,60% 100%,75% 70%,95% 60%,105% 0}100%{background-position:0 90%,20% 90%,45% 70%,60% 110%,75% 80%,95% 70%,110% 10%;background-size:0 0,0 0,0 0,0 0,0 0,0 0}}</style>"

    let animateButton = function (e) {
        e.preventDefault;
        //reset animation
        e.target.classList.remove('animate');

        e.target.classList.add('animate');
        setTimeout(function () {
            e.target.classList.remove('animate');
        }, 700);
    };

    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    function czy_czynnosc_dodana(czynnosc) {
        return $('div_typyczynnosci_lista').textContent.toLowerCase().includes(czynnosc.nazwa.toLowerCase());
    }

    async function wypelnij_typ_czynnosci(czynnosc) {
        if (czy_czynnosc_dodana(czynnosc)) return;
        f_dodaj_typ_czynnosci('');
        await waitForElm('#gabzab_typczynnosci2_t');
        $('gabzab_typczynnosci2_w').setAttribute('value', czynnosc.id);
        $('gabzab_typczynnosci2_t').setAttribute('value', czynnosc.nazwa);
        $('czynnosc_typ').innerHTML = czynnosc.nazwa;
        f_zbierz_info_czynnosc('', 'T');
    }

    function dodaj_szablon_opisu(config) {
        const textarea = $('gab_badanie_przedmiotowe_w');
        if (textarea.value !== '') textarea.value += '\n';
        textarea.value += config.szablon_opisu;
    }

    async function wypelnij_czynnosci_i_miejsce(config) {
        for (const element of config.czynnosci) {
            await wypelnij_typ_czynnosci(element);
        }
        $('sel_zab_miejsce').value = config.miejsce;
        $('gab_komorka2_w').value = KOMORKA_ZLECAJACA_ID;
    }

    async function wypelnij_pola(config) {
        console.dir(config)
        await wypelnij_czynnosci_i_miejsce(config);
        dodaj_szablon_opisu(config);
    }

    const HISTORIA_WIZYT_URL = 'ap_wizyty_nowe_hist.historia_wizyt_lista_html';
    const HISTORIA_MIESIECY = 6;
    const POLE_BADANIE = 'Badanie przedmiotowe';
    const POLE_CZYNNOSCI = 'Wykonane czynności';
    const CZYNNOSC_OPATRUNEK = 'zmiana opatrunku';
    const PRESET_OPATRUNEK = PRESETS.find(p => p.btn_id === 'opatrunek_btn');
    const ZNACZNIK_BR = '\u0000';
    const NAGLOWEK_DATY = 'Skopiowane z wizyty z dnia';
    let wstawianie_w_toku = false;

    function pobierz_kod_historii() {
        const kod = typeof wizhist_f_zastosuj_filtr === 'function' && /\[\[302]](\d+)/.exec(String(wizhist_f_zastosuj_filtr))?.[1];
        if (!kod) throw new Error('nie znaleziono kodu historii wizyt w funkcjach Serum');
        return kod;
    }

    function sformatuj_date(d) {
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    }

    function wyciagnij_tekst_komorki(komorka) {
        if (!komorka) return '';
        const klon = komorka.cloneNode(true);
        klon.querySelectorAll('br').forEach(br => br.replaceWith(ZNACZNIK_BR));
        return klon.textContent.replace(/\s+/g, ' ').split(ZNACZNIK_BR).map(l => l.trim()).join('\n').trim();
    }

    async function pobierz_historie_wizyt(idpacjenta, data_od, data_do) {
        const losowy = Math.round(Math.random() * 9999999999);
        const dane_post = `DEF2]]2[[9995]]${losowy}[[26]]${idpacjenta}[[242]][[270]]0[[302]]${pobierz_kod_historii()}[[733]]`
            + `[[1291]]W[[1292]][[1293]]-1[[1294]]${data_od}[[1295]]${data_do}[[1296]][[1299]]-1`
            + '[[1300]][[1301]][[1302]][[1303]]-1[[5000]]GAB';
        const odpowiedz = await fetch(HISTORIA_WIZYT_URL, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: 'p=' + dane_post,
        });
        if (!odpowiedz.ok) throw new Error(`Serum odpowiedział kodem ${odpowiedz.status}`);
        const kodowanie = /charset=([\w-]+)/i.exec(odpowiedz.headers.get('content-type') || '')?.[1] || document.characterSet;
        const html = new TextDecoder(kodowanie).decode(await odpowiedz.arrayBuffer());
        if (html.includes('loginNow')) {
            const blad = /(?:^|;\s*)blad=(\d+)/.exec(document.cookie)?.[1] ?? '?';
            throw new Error(blad === '6'
                ? 'Serum odrzucił żądanie jako naruszenie zasad bezpieczeństwa (kod 6)'
                : `sesja Serum wygasła, zaloguj się ponownie (kod ${blad})`);
        }
        return new DOMParser().parseFromString(html, 'text/html');
    }

    function usun_naglowki_dat(tekst) {
        return tekst.split('\n').filter(linia => !linia.startsWith(NAGLOWEK_DATY)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    function wyciagnij_wizyty(dokument) {
        return [...dokument.querySelectorAll('input[name="wizhist_wybrane_wizyty"]')].map(naglowek => {
            const szczegoly = naglowek.closest('tr')?.nextElementSibling;
            const pola = {};
            szczegoly?.querySelectorAll('tr[class$="_p2"]').forEach(tr => {
                if (tr.cells.length === 2) pola[tr.cells[0].textContent.trim()] = wyciagnij_tekst_komorki(tr.cells[1]);
            });
            if (pola[POLE_BADANIE]) pola[POLE_BADANIE] = usun_naglowki_dat(pola[POLE_BADANIE]);
            return { data: naglowek.getAttribute('wizyta_z_dnia'), idzabiegu: naglowek.dataset.idzabiegu, pola };
        });
    }

    async function wstaw_poprzednia_wizyte() {
        if (wstawianie_w_toku) return;
        const idpacjenta = $('gab_pacjent1_w').value;
        const biezacy_idzabiegu = $('hid_idzabiegu')?.value || '';
        if (idpacjenta === '') { alert('Proszę wybrać pacjenta'); return; }
        const textarea = $('gab_badanie_przedmiotowe_w');
        const przycisk = $(POPRZEDNIA_WIZYTA_BTN.btn_id);
        wstawianie_w_toku = true;
        przycisk.style.pointerEvents = 'none';
        przycisk.style.opacity = '0.5';
        try {
            uf_wyswietl_komunikat('Trwa pobieranie historii wizyt');
            const dzis = new Date();
            const data_od = new Date(dzis);
            data_od.setMonth(data_od.getMonth() - HISTORIA_MIESIECY);
            const pasuje = w => w.idzabiegu !== biezacy_idzabiegu && w.pola[POLE_BADANIE]
                && (w.pola[POLE_CZYNNOSCI] || '').toLowerCase().includes(CZYNNOSC_OPATRUNEK);
            const wizyta = wyciagnij_wizyty(await pobierz_historie_wizyt(idpacjenta, sformatuj_date(data_od), sformatuj_date(dzis))).find(pasuje);
            if (!wizyta) { alert(`Pacjent nie ma w ostatnich ${HISTORIA_MIESIECY} miesiącach wizyty z czynnością "${CZYNNOSC_OPATRUNEK}" i wypełnionym polem "${POLE_BADANIE}".`); return; }
            const tekst = `${NAGLOWEK_DATY} ${wizyta.data}:\n\n${wizyta.pola[POLE_BADANIE]}`;
            if (textarea.value.trim() !== '') textarea.value += '\n';
            textarea.value += tekst;
            await wypelnij_czynnosci_i_miejsce(PRESET_OPATRUNEK);
        } catch (e) {
            console.error(e);
            alert('Nie udało się wstawić poprzedniej wizyty: ' + e.message);
        } finally {
            uf_schowaj_komunikat();
            wstawianie_w_toku = false;
            przycisk.style.pointerEvents = '';
            przycisk.style.opacity = '';
        }
    }

    const POPRZEDNIA_WIZYTA_BTN = {
        btn_id: 'poprzednia_wizyta_btn',
        btn_name: 'Wstaw poprzednią wizytę opatr.',
        kolor: COLOR_OVERRIDE.navy,
        callback: wstaw_poprzednia_wizyte,
    };

    function addButton(config, container) {
        const color_override = config.kolor ? ' ' + config.kolor : '';
        const button = `<a class="bubbly-button${color_override}" id="${config.btn_id}" href="#">${config.btn_name}</a>`
        container.insertAdjacentHTML('beforeend', button);
        $(config.btn_id).addEventListener('click', config.callback, false);

    }

    function addAllButtons() {
        let container = document.getElementsByClassName('td_wiznow_gora')[0]
        container.innerHTML += BTN_STYLE
        PRESETS.forEach(element => {
            addButton(element, container)
        });
        addButton(POPRZEDNIA_WIZYTA_BTN, container);
        let bubblyButtons = document.getElementsByClassName("bubbly-button");
        for (const element of bubblyButtons) {
            element.addEventListener('click', animateButton, false);
        }
    }

    const targetNode = document.getElementsByTagName('body')[0];
    const config = { attributes: true, childList: true, subtree: true };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList" && mutation.addedNodes.length && mutation.addedNodes[0].classList &&
                mutation.addedNodes[0].classList.length && mutation.addedNodes[0].classList.contains('pas_win')
            ) {
                addAllButtons();
            }
        }
    };
    const obs = new MutationObserver(callback);
    obs.observe(targetNode, config);

})();