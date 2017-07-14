/*  Skrypt obliczający taksę notarialną

    calculate(obj[, e]): funkcja obliczająca taksę notarialną i zwracająca obiekt z wynikami
        przyjmuje obiekt:
                zbiór danych potrzebnych do wykonania obliczeń jako obiekt; wymagane dane:
                    type:          typ nieruchomości (0 - spółdzielcze własnościowe, 1 - pełna własność z KW, 2 - dom/grunt)
                    developer:     zakup od dewelopera
                    mortgage:      zakup na kredyt
                    propertyPrice: cena nieruchomości
                    agency:        prowizja agencji
                    newRegistry:   zakładanie nowej KW
                    hasRegistry:   posiada KW (założenie nowej KW wymusza posiadanie)

        zwraca obiekt:
                zbiór danych wynikowych:
                    pcc:        podatek PCC
                    notary:     opłata notarialna
                    vat:        VAT od podatku notarialnego
                    agency:     prowizja agencyjna
                    registry:   opłata sądowa za założenie KW
                    legal:      opłata sądowa
                    sum:        łączny koszt
                    msg:        informacja zwrotna (gdy błędy)


    doCalc(): zbiera dane z formularza, wywołuje obliczenia i wyniki wypisuje w formularzu

    checkForm([e]): sprawdza poprawność ustawienia formularza
        e - opcjonalny argument Event, który przekazuje informaczję o klikniętym lub zmienionym elementu formularza
*/

var formHnd = {};

function calculate(obj) {
    var msg = [],
        pcc = notary = vat = agency = registry = legal = sum = 0;

    // Zwracanie wyniku
    var ret = function() {
        msgJoined = msg.join("<br/>");
        // W przypadku błędu krytycznego zwrot samych zer wraz z zwrotną informacją = nie można obliczyć
        if (msg.length > 0 && msg.err) {
            return {
                pcc: 0,
                notary: 0,
                vat: 0,
                agency: 0,
                registry: 0,
                legal: 0,
                msg: msgJoined,
                sum: 0
            };
        }
        return {
            pcc: pcc,
            notary: notary,
            vat: vat,
            agency: agency,
            registry: registryFee,
            legal: legal,
            msg: msgJoined,
            sum: pcc + notary + vat + agency + legal
        };
    }

    // Typy nieruchomości (obj.type) wartości:
    // 0 - spółdzielcze własnościowe prawo do lokalu
    // 1 - pełna własność z KW
    // 2 - dom/grunt

    if (obj.propertyPrice === undefined || isNaN(obj.propertyPrice) || obj.propertyPrice === null || obj.propertyPrice < 0) {
        obj.propertyPrice = 0;
    }

    if (obj.agency === undefined || isNaN(obj.agency) || obj.agency === null || obj.agency < 0) {
        obj.agency = 0;
    }

    if (obj.type < 0) {
        msg.push("Wybierz właściwy typ.");
        msg.err = true;
    }

    if (!obj.newRegistry) obj.newRegistry = false;
    if (!obj.hasRegistry) obj.hasRegistry = false;

    if (!(obj.newRegistry === true || obj.hasRegistry === true) && obj.mortgage === true) {
        msg.push("Na zakup nieruchomości spółdzielczej własnosciowej musi zostać założona lub być prowadzona Księga Wieczysta aby móc dokonać wpisu hipoteki.");
        msg.err = true;
    }

    if (msg.length > 0 || msg.err === true) {
        return ret();
    }

    // Jeżeli zostanie wybrany dany typ nieruchomości taksa notarialna stanowi taką część kwoty wynikającej z zakładki opłaty notarialne
    var ratio = obj.type === 2 ? 1 : 0.5;

    if (obj.developer === true && obj.newRegistry === false && obj.hasRegistry === false) pcc = 0; else pcc = obj.propertyPrice * 0.02 + (!obj.developer && obj.mortgage ? 19 : 0);

    if (obj.propertyPrice > 0 && obj.propertyPrice <= 3000) notary = 100;
    else if (obj.propertyPrice > 3000 && obj.propertyPrice <= 10000) notary = 100+0.03*(obj.propertyPrice-3000);
    else if (obj.propertyPrice > 10000 && obj.propertyPrice <= 30000) notary = 310+0.02*(obj.propertyPrice-10000);
    else if (obj.propertyPrice > 30000 && obj.propertyPrice <= 60000) notary = 710+0.01*(obj.propertyPrice-30000);
    else if (obj.propertyPrice > 60000 && obj.propertyPrice <= 1000000) notary = 1010+0.004*(obj.propertyPrice-60000);
    else if (obj.propertyPrice > 1000000 && obj.propertyPrice <= 2000000) notary = 4770+0.002*(obj.propertyPrice-1000000);
    else if (obj.propertyPrice > 2000000) notary = 6770+ Math.min(7500, 0.0025*(obj.propertyPrice-2000000));

    notary *= ratio;

    var vat = notary*0.23;

    var agency = obj.agency ? obj.agency/100*obj.propertyPrice : 0;

    var registryFee = obj.newRegistry ? 60 : 0;

    var legal = (obj.hasRegistry ? 200 : 0) + registryFee + (obj.mortgage ? 200 : 0);

    return ret();
}

function doCalc() {
    // Zebranie danych
	var type = parseInt($("#type")[0].value)-1,
		developer = $("form input[name=developer]")[0].checked,
		mortgage = $("form input[name=mortgage]")[0].checked,
		newRegistry = $("form input[name=newRegistry]")[0].checked,
		hasRegistry = $("form input[name=hasRegistry]")[0].checked,
		propertyPrice = parseFloat($("#price")[0].value),
		agency = parseFloat($("#agency")[0].value);

    // Wywołanie obliczeń
	var result = calculate({
        type: type,
		developer: developer,
		mortgage: mortgage,
		propertyPrice: propertyPrice,
		agency: agency,
		newRegistry: newRegistry,
		hasRegistry: hasRegistry
	});

	// Wypisanie wyników
	$("#info").html(result.msg);
	if (result.msg === "") {
        $("#info").css("display", "none");
    } else {
        $("#info").css("display", "block");
    }
	$("#pccSum").text(result.pcc.toFixed(2)+" zł");
    $("#notarySum").text(result.notary.toFixed(2)+" zł");
    $("#vatSum").text(result.vat.toFixed(2)+" zł");
    $("#agencySum").text(result.agency.toFixed(2)+" zł");
    $("#legalSum").text(result.legal.toFixed(2)+" zł");
    $("#costSum").text(result.sum.toFixed(2)+" zł");
}

function checkForm(e) {
    // Zapisanie poprzedniego stanu pola
    if (e && (this === formHnd.type || this === formHnd.hasRegistry)) this.state = this.checked;

    // Zmiana typu nieruchomości na spółdzielczą przy zakupie na kredyt lub zmiana typu nieruchomości na pełną własność albo dom/grunt powoduje
    // wymuszenie wpisu do KW i zablokowanie pola
    if ((parseInt(formHnd.type.value) === 1 && formHnd.mortgage.checked === true) || formHnd.type.value > 1 || formHnd.newRegistry.checked === true) {
        // Jeżeli jest zakładana Księga Wieczysta to automatycznie jest naliczana opłata za prowadzenie
        formHnd.hasRegistry.checked = true;
        formHnd.hasRegistry.disabled = true;
    } else {
        // Przywrócenie pola
        if (e && (e.target === formHnd.type || e.target === formHnd.mortgage || e.target === formHnd.newRegistry)) {
            formHnd.hasRegistry.checked = formHnd.hasRegistry.state;
            formHnd.hasRegistry.disabled = false;
        }
    }

    doCalc();
}

// Przygotowanie uchwytów globalnych celem uproszczenia dostępu
formHnd.type = $("form select[name=type]")[0];
formHnd.typeState = 0;
formHnd.developer = $("form input[name=developer]")[0];
formHnd.mortgage = $("form input[name=mortgage]")[0];
formHnd.newRegistry = $("form input[name=newRegistry]")[0];
formHnd.hasRegistry = $("form input[name=hasRegistry]")[0];

// Obejście nieprawidłowego zachowania się na urządzeniach mobilnych
$("form select[name=type]").click(function(e) {
    formHnd.typeState = formHnd.type.value;
    $(this).change();
}).change(function(e) {
    checkForm(e);
});

// Przypisanie zdarzeń formularzowi
$("form input[name=mortgage], form input[name=developer], form input[name=mortgage], form input[name=newRegistry], form input[name=hasRegistry]").on("click", checkForm);
$("form input[type=number]").on("keyup", checkForm);

doCalc();