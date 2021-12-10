"use strict";

// Api servis bilgilerimizi sabit bir değişkene atıyoruz.
const api = {
	url : '//www.omdbapi.com',
	key : 'API_KEY',
	plot: 'full',
	type: 'movie'
};

jQuery(function( $ ) {

	// Element seçicilerimizi tanımlıyoruz.
	let search = $('#search');
	let movies = $('#movies');
	let prevSearch = $('.prev-search', search);

	// searchKeys fonksiyonu, aranan kelimeleri localStorage'da tutup hızlı arama ekranımız olan "autocomplete" listesine eklemektedir.
	let searchKeys = (a, b = "add") => {
		if (a == '' && b == "add") return false;

		// Object'imizi tanımlıyoruz.
		let obj = localStorage.getItem('searchList') || [];

		// localStorage'daki json verimizi string'ten object'e parse edip sonra da array'e çeviriyoruz.
		if (typeof obj == 'string') obj = Object.values(JSON.parse(obj));

		// Formdan gelen kelimeyi dizi içinde arayıp yoksa diziye ekliyoruz.
		// Aynı zamanda localStorage'daki eski aramalar 10'dan fazla ise en eski olan kaydı listeden siliyoruz.
		if (b == 'add' && obj.indexOf(a) == -1) {
			if (obj.length > 10) obj.splice(0, 1);
			obj.push( a );
		}

		// Dizi içindeki ilgili elemanı siliyoruz.
		else if (b == 'delete') {
			obj.splice(a, 1);
		}

		// Önceki aramaların "autocomplete" olarak görünmesi için gerekli HTML kodumuzu oluşturuyoruz.
		else if (b == 'prevlist') {
			prevSearch.empty();
			$.each(obj, (index, key) => {
				$(`<li data-key="${key}">${key} <span class="remove">&times;</span></li>`).appendTo( prevSearch );
			});
		}

		// Arama listemizi localStorage'a json string olarak kaydediyoruz.
		localStorage.setItem('searchList', JSON.stringify(Object.assign({}, obj)));

		// Yeni arama yapıldığında "autocomplete" listemize anında eklenmesini sağlıyoruz.
		if (b == 'add') {
			searchKeys('', 'prevlist');
		}
	};


	// Önceki aramalarımızı görmek ve hızlı arama yapmabilmek için localStorage'da kayıtlı verimizi alıp "autocomplete" listemizi dolduruyoruz.
	searchKeys('', 'prevlist');


	// Arama kutumuza girilen kelimeyi sayfamızı yenilemeden "form submit" metoduyla api bağlantımıza gönderip dönen json verimizi işliyoruz.
	search.submit((e) => {
		e.preventDefault();
		let el = $(this);
		let searchText = $('input:text', el).val();

		// Arama yapıldığı anda 2 saniyeliğine submit butonunun çalışmasını devre dışı bırakıyoruz.
		$(':submit', el).prop('disabled', true);

		setTimeout(function() {
			$(':submit', el).prop('disabled', false);
		}, 2000);

		// Aranan kelimeyi localStorage'a gönderiyoruz.
		searchKeys(searchText);

		// Api'a sorgu atarak ilgili kelimeyi search ediyoruz ve response'dan dönen json formatındaki veriyi işliyoruz.
		$.get(
			api.url,
			{
				'apikey': api.key
				,'plot' : api.plot
				,'type' : api.type
				,'s'    : searchText
			}
		,'jsonp')

		.done((response) => {
			// console.log(response);
			let html = '';

			// Dönen json verimizi döngüye sorarak ayrıştırıyoruz.
			$.each(response.Search, (count, list) => {
				if (list.Type !== "movie") return false;
				if (list.Poster === 'N/A') list.Poster = '';

				// Kelime aramasıyla dönen json verisinde "rating" bilgisi bulunmadı için "imdbID" bilgisi göndererek her filmin puanını ayrıca çektiyoruz.
				$.get(
					api.url,
					{
						'apikey': api.key
						,'i'    : list.imdbID
					}
				,'jsonp')

				.done((d) => {

					// Filmin puan durumu "N/A" olarak dönenleri "0" olarak değiştiriyoruz.
					if (d.imdbRating === 'N/A') d.imdbRating = 0;

					// 0/10 arasındaki puan bilgisini 10 ile çarparak 100 üzerinden hesaplama yaptırıyoruz.
					// Yeni puan 0<>20 arası kırmızı, 21<>50 arası sarı, 50 üzerinde ise yeşil bant ekliyoruz.
					let ratingWidth = d.imdbRating * 10;
					let ratingClass = "red";
					if (ratingWidth > 20 && ratingWidth <= 50) ratingClass = "yellow";
					if (ratingWidth > 50) ratingClass = "green";

					// Her film için HTML kodumuzu oluşturup değişkene atıyoruz.
					html += '<div class="item">';
						html += `<a href="https://www.imdb.com/title/${list.imdbID}/" target="_blank" class="image">`;
							html += `<img data-src="${list.Poster}" alt="${list.Title}" class="lazy" />`;
							html += `<span class="rating">IMDb Puanı: ${d.imdbRating} / 10</span>`;
						html += '</a>';
						html += `<h2><a href="https://www.IMDb.com/title/${list.imdbID}/" target="_blank">${list.Title}</a></h2>`;
						html += `<span class="rating-bar"><span class="${ratingClass}"></span></span>`;
					html += '</div>';
				})

				.always(() => {
					// Döngü tamamlandığında html değişkenimizi movies div'i içinde DOM'a dahil ediyoruz.
					movies.html( html );

					// Film posterlerinin lazy-load eklentisi yüklenmesini sağlıyoruz.
					$('.lazy').lazyload();
				});
			});
		})

		.fail(() => {
			// Api bağlantımızda herhangi bir problem olduğunda uyarı veriyoruz.
			alert('Bir hata oluştu.');
		});
	})

	// Sayfa ilk açıldığında arama formumuzu tetikliyoruz.
	.trigger('submit');


	// Arama kutusuna tıklandığında "autocomplete" listemizi görünür hale getirmek için gerekli class'ını ekliyoruz.
	$('input:text', search).focus(function(e) {
		$(this).parent().addClass('focus');
	});


	// Arama kutusundan çıkıldığında "autocomplete" listemizi gizlemek için .focus class'ını siliyoruz.
	$(window).mousedown(function(e) {
		if (!$(e.target).closest('.label').length)
			$('.focus', search).removeClass('focus');
	});


	// Hızlı arama "autocomplete" listemizden daha önce aranmış bir kelimeye tıklayarak yeniden arama yapabilmeyi sağlıyoruz.
	prevSearch.on('click', 'li', function(e) {
		if ($(e.target).is('.remove')) return false;
		$('input:text', search).val( $(this).data('key') );
		$('.focus', search).removeClass('focus');
		search.trigger('submit');
	});


	// Hızlı arama listemizden X butonuna tıklayarak kelimenin silinmesini sağlıyoruz.
	prevSearch.on('click', '.remove', function(e) {
		let li = $(this).parent();
		if (li.data('key') == $('input:text', search).val()) $('input:text', search).val('');
		searchKeys(li.index(), 'delete');
		li.remove();
	});

});