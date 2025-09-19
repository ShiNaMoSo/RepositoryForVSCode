// 変数はローワーキャメルケース  camelCase-
//関数名は動詞＋名詞

//高解像度のスマホ対応用
const devicePixelRatio = window.devicePixelRatio || 1;//undefinedや0/nullなど「偽」の場合、右側（1）を返す

//メインのキャンバス
const canvas = document.createElement('canvas');//この時点ではJavaScriptのメモリ上で生成する。HTMLツリー（DOM）には出現しない
const ctx = canvas.getContext('2d');
//読み込んだ画像をモーダル内で表示するキャンバス
const canvasModal = document.getElementById('canvas-modal');
const ctxModal = canvasModal.getContext('2d');
//トリミング後の画像を表示する（実際は非表示）キャンバス
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

//初期画像処理
const imgSrc = "https://shinamoso.github.io/RepositoryForVSCode/img/02-prf.png"; // 元画像のURL
const resultImg = document.getElementById('result-img');
// const imgSrc = "/img/test.png"; // test用画像のURL
resultImg.src = imgSrc;// 画像表示


//プロフィールアイコン読み込み処理
const inputImg = document.getElementById('input-img-import');
const imgInputLabel = document.getElementById('label-img-import');

//モーダル系の要素
const modalBackground = document.getElementById('modal-container');
const modalCloseBtn = document.getElementById('modal-close-button');
const modalBody = document.getElementById('modal-body');
const modalContent = document.getElementById('modal-content');
const modalHeader = document.getElementById('modal-header');

const generateBtn = document.getElementById('generate-button');
const downloadLink = document.getElementById('downloadlink');
const downloadBtn = document.getElementById('download-button');

const inputText = document.getElementById('input-blader-name');
const inputAge = document.getElementById('input-age');
const inputGender = document.getElementById('input-gender');
const inputLocation = document.getElementById('input-location');
const inputGeneration = document.getElementById('input-generation');
const inputMaxPower = document.getElementById('input-max-power');
const inputLauncher = document.getElementById('input-launcher');
const inputTournament = document.getElementById('input-tournament');
const inputFreeComment = document.getElementById('input-free-comment');

//画面サイズ
const mediaQuerySp = window.matchMedia('(max-width: 425px)');
const mediaQueryTablet = window.matchMedia('(min-width: 426px)and (max-width: 1023px)');
const mediaQueryPc = window.matchMedia('(min-width: 1024px)');



function closeModal() {
	modalBackground.style.display = 'none';//子要素も自動的に消える（継承ではなくそのような仕様）
}

//モーダルのバツ印がクリックされた時
modalCloseBtn.addEventListener('click', closeModal);

//モーダルの背景部分がクリックされた時
modalBackground.addEventListener('click', (e)=>{
		if (e.target == modalBackground) { //e.target イベントが発生した要素（子要素含む）を取得しmodalBackgroundの要素と同じ場合実行 すなわちモーダルの背景部分がクリックされたとき実行
		closeModal();
	}//子要素だけがクリックした場合は処理しない
});


let img = new Image();
let drawWidth
let drawHeight;

function updateImageInputLabel() {
	if (inputImg.files.length > 0) {
		imgInputLabel.textContent = '選択済み✅';
	} else {
		imgInputLabel.textContent = 'アイコン画像を選択';
	}
}

//画像選択時の処理
inputImg.addEventListener('change', (e) => {
	updateImageInputLabel();

	//モーダルを表示
	modalBackground.style.display = 'block';

	//モーダルが表示後に計算する必要あり
	const modalHorizontalPadding = parseFloat(window.getComputedStyle(modalBody).paddingRight) * 2;//モーダルの横の余白を取得
	const modalVerticalMargin = parseFloat(window.getComputedStyle(modalContent).marginTop) * 2 + parseFloat(window.getComputedStyle(modalHeader).height) * 2.4;//Androidのナビゲーションバー用にヘッダーも2.4倍にしている

	drawWidth = modalBody.clientWidth - modalHorizontalPadding
	let maxHeight = window.innerHeight - modalVerticalMargin;

	const file2 = e.target.files[0];
	if (!file2) return;
	const reader = new FileReader();


	//選択画像が読み込まれたら実行
	reader.onload = event => {
		img.src = event.target.result;//読み込んだ画像（Base64エンコードされた文字列）をsrcに設定
		img.onload = () => {
			[drawWidth, drawHeight] = adjustModalCanvasSize(img, drawWidth, maxHeight);
			draw(img, drawWidth, drawHeight);
		};
	};
	reader.readAsDataURL(file2);//Data URL形式（Base64エンコードされた文字列）にする onloadのイベントハンドラを登録してから記載する
});



let cropRect = {};//オブジェクト;
let handleSize;

function initializeTrimming() {
	//スマホ表示時は初期トリミング範囲を小さくしてハンドルサイズを大きくする
	if (document.documentElement.clientWidth < 768) {
		cropRect = { x: 50, y: 50, w: 100, h: 100 };//オブジェクト
		handleSize = 24;
	} else if (document.documentElement.clientWidth < 1024) {
		cropRect = { x: 50, y: 50, w: 200, h: 200 };
		handleSize = 12;
	} else {
		cropRect = { x: 50, y: 50, w: 400, h: 400 };
		handleSize = 12;
	}
}

initializeTrimming();

//トリミング範囲の矩形
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isResizing = false;
let resizeDir = '';

//ハンドル＝トリミング範囲の小さい8つの四角形を描画
function drawHandle(x, y) {
	ctxModal.fillStyle = 'white';
	ctxModal.strokeStyle = 'blue';
	ctxModal.lineWidth = 2;
	ctxModal.beginPath();
	ctxModal.rect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
	ctxModal.fill();//塗りつぶし
	ctxModal.stroke();
}

function getAllHandles() {
	const x = cropRect.x, y = cropRect.y, w = cropRect.w, h = cropRect.h;
	//nwの命名はnorth west（北西）トリミングボックスのハンドル部分をを計算
	return [//配列にオブジェクトが入っている
		{ dir: 'nw', x: x, y: y },
		{ dir: 'n', x: x + w / 2, y: y },
		{ dir: 'ne', x: x + w, y: y },
		{ dir: 'e', x: x + w, y: y + h / 2 },
		{ dir: 'se', x: x + w, y: y + h },
		{ dir: 's', x: x + w / 2, y: y + h },
		{ dir: 'sw', x: x, y: y + h },
		{ dir: 'w', x: x, y: y + h / 2 },
	];
}

function draw(img, drawWidth, drawHeight) {
	//念のためクリアしてから描画
	ctxModal.clearRect(0, 0, canvasModal.width, canvasModal.height);

	//devicePixelRatio分拡大 第1引数 : X方向の拡大・縮小（スケールX）2 : X方向の傾斜（shearY, skew）3 : Y方向の傾斜（shearX, skew）4 : Y方向の拡大・縮小（スケールY）5 : X方向の平行移動（translateX）6 : Y方向の平行移動（translateY）
	ctxModal.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
	ctxModal.drawImage(img, 0, 0, drawWidth, drawHeight);

	// トリミング範囲を描画
	ctxModal.fillStyle = 'rgba(0, 0, 255, 0.3)';//塗りつぶしの色
	ctxModal.fillRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);//塗りつぶしの四角形を描画
	ctxModal.strokeStyle = 'blue';//枠線の色
	ctxModal.lineWidth = 2;
	ctxModal.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);//枠線を描画

	// Draw handles (四隅＋4辺) //getAllHandles()で配列を取得してforEachで繰り返し
	getAllHandles().forEach(h => drawHandle(h.x, h.y));
}



const directionToCursor = {
	'n': 'n-resize',
	'e': 'e-resize',
	's': 's-resize',
	'w': 'w-resize',
	'ne': 'ne-resize',
	'nw': 'nw-resize',
	'se': 'se-resize',
	'sw': 'sw-resize'
};

function getHandleAt(x, y) {
	return getAllHandles().find(h =>
		x >= h.x - handleSize / 2 && x <= h.x + handleSize / 2 &&
		y >= h.y - handleSize / 2 && y <= h.y + handleSize / 2
		//xが数値以上数値以下かつyが数値以上数値以下
	)?.dir || '';//論理和（OR演算子）||は、expr1 || expr2 expr1 を true と見ることができる場合は、expr1 を返します。そうでない場合は、expr2 を返す
}

//トリミングボックスの範囲内であればtrueを返す
function inRect(x, y) {
	return (
		x >= cropRect.x &&
		x <= cropRect.x + cropRect.w &&
		y >= cropRect.y &&
		y <= cropRect.y + cropRect.h
	);
}

function getPosFromEvent(e) {
	const rect = canvasModal.getBoundingClientRect();//要素の現在のビューポート（ブラウザの表示領域）に対する相対位置とサイズを示す DOMRect オブジェクトを返す
	if (e.touches && e.touches.length > 0) {
		return {
			//クライアン座標からcanvasの左上の座標を引くことでcanvasの左上を(0,0)とした座標を取得
			x: e.touches[0].clientX - rect.left,
			y: e.touches[0].clientY - rect.top,
		};
	} else {
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}
}

//カーソルの形状を変更
function setCursor(e) {
	const pos = getPosFromEvent(e);
	const dir = getHandleAt(pos.x, pos.y);
	if (dir && directionToCursor[dir]) {
		canvasModal.style.cursor = directionToCursor[dir];
	} else if (inRect(pos.x, pos.y)) {
		canvasModal.style.cursor = "move";
	} else {
		canvasModal.style.cursor = "default";
	}
}

function startDrag(e) {
	e.preventDefault();//イベントのデフォルト動作（例えばテキストの選択や画面のスクロールなど）を防止。

	const pos = getPosFromEvent(e);
	const handle = getHandleAt(pos.x, pos.y);
	if (handle) {
		isResizing = true;
		resizeDir = handle;
	} else if (inRect(pos.x, pos.y)) {
		isDragging = true;
		dragOffsetX = pos.x - cropRect.x;//方角の8つの点からの距離
		dragOffsetY = pos.y - cropRect.y;//方角の8つの点からの距離
	}
}

function moveDrag(e) {
	if (!isDragging && !isResizing) {//マウスクリックして移動中（ドラッグ）以外の時実行 どちらかが!trueになるのはマウスクリックして移動中（ドラッグ）中のみ
		setCursor(e);
		return;
	}
	e.preventDefault();
	const pos = getPosFromEvent(e);

	if (isDragging) {
		//pos.x - dragOffsetXで移動先のトリミング範囲の左上のX座標と、canvasModal.width - cropRect.wでキャンバスの右端からトリミング範囲の幅を引いた値を比較して小さい方を採用し（canvasModal.width - cropRect.wより大きい場合はトリミング範囲が場外になるので）、さらに0と比較して大きい方を採用することで、X座標がマイナスにならないようにしている（画像外に出ないように）
		cropRect.x = Math.max(0, Math.min(canvasModal.width - cropRect.w, pos.x - dragOffsetX));
		cropRect.y = Math.max(0, Math.min(canvasModal.height - cropRect.h, pos.y - dragOffsetY));
	} else if (isResizing) {
		let minW = handleSize, minH = handleSize;
		let x = cropRect.x, y = cropRect.y, w = cropRect.w, h = cropRect.h;
		switch (resizeDir) {
			case 'nw':
				w += x - pos.x; h += y - pos.y; x = pos.x; y = pos.y; break;
			case 'n':
				h += y - pos.y; y = pos.y; break;
			case 'ne'://xは左上の座標なので変わらない
				w = pos.x - x; h += y - pos.y; y = pos.y; break;
			case 'e':
				w = pos.x - x; break;
			case 'se'://xとyは左上の座標なので変わらない
				w = pos.x - x; h = pos.y - y; break;
			case 's':
				h = pos.y - y; break;
			case 'sw':
				w += x - pos.x; x = pos.x; h = pos.y - y; break;
			case 'w':
				w += x - pos.x; x = pos.x; break;
		}
		// 最小サイズ制御
		w = Math.max(w, minW);
		h = Math.max(h, minH);

		// 画像外に出ないよう制御
		if (x < 0) { w += x; x = 0; }//widthを飛び出ている分足す
		if (y < 0) { h += y; y = 0; }
		if (x + w > canvasModal.width) w = canvasModal.width - x;//widthは最大でもcanvasModal.widthまでの大きさになるべきなので、xが0から動いた分を引くことで調整
		if (y + h > canvasModal.height) h = canvasModal.height - y;
		cropRect = { x, y, w, h };
	}
	//ここまでで計算しかしてないので、draw();で実際に描画する
	draw(img, drawWidth, drawHeight);
}

//ブーリアン値を初期状態に戻す
function endDrag(e) {
	isDragging = false;
	isResizing = false;
}


canvasModal.addEventListener('mousedown', startDrag);//マウスボタン押下 (ドラッグの開始時にも)トリミングとハンドル範囲内以外なら何もしない
canvasModal.addEventListener('mousemove', moveDrag);//マウス移動
canvasModal.addEventListener('mouseup', endDrag);//マウスボタンを離す
canvasModal.addEventListener('mouseleave', endDrag);//マウスがキャンバスから離れた

canvasModal.addEventListener('touchstart', startDrag);
canvasModal.addEventListener('touchmove', moveDrag);
canvasModal.addEventListener('touchend', endDrag);
canvasModal.addEventListener('touchcancel', endDrag);//システム（着信やアラーム）などによってタッチ操作がキャンセル

document.getElementById('crop-button').addEventListener('click', () => {
	resultCanvas.width = cropRect.w * devicePixelRatio;
	resultCanvas.style.width = cropRect.w + "px";
	resultCanvas.height = cropRect.h * devicePixelRatio;
	resultCanvas.style.height = cropRect.h + "px";
	resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
	resultCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
	resultCtx.drawImage(
		img,
		cropRect.x * (img.width / drawWidth), // 元画像の切り取り開始位置の左上のX座標
		cropRect.y * (img.height / drawHeight),
		cropRect.w * (img.width / drawWidth),// 描画する幅（切り取りサイズと同じなのでリサイズなし）
		cropRect.h * (img.height / drawHeight),
		0,//キャンバス上に描画する左上の座標
		0,
		cropRect.w,//描画先での幅（拡大/縮小）
		cropRect.h
	);
	updateInputFileFromCanvas(resultCanvas);
	initializeTrimming();
	modalBackground.style.display = 'none';
});



// キャンバス調整＆描画関連
function adjustModalCanvasSize(img, drawWidth, maxHeight) {

	// 画像の縦横比とコンテナの縦横比を計算
	const imgRatio = img.width / img.height;

	// Canvasの高さをCanvasの横幅を元に算出（画像の比率と同じになるようにする）
	drawHeight = drawWidth / imgRatio;


	// もし高さがコンテナの高さを超える場合は、高さをコンテナに合わせて、幅を調整
	if (drawHeight > maxHeight) {
		drawHeight = maxHeight;
		drawWidth = drawHeight * imgRatio;
	}

	//物理ピクセル
	canvasModal.width = drawWidth * devicePixelRatio;
	canvasModal.height = drawHeight * devicePixelRatio;
	//論理ピクセル
	canvasModal.style.width = drawWidth + "px";
	canvasModal.style.height = drawHeight + "px";
	return [drawWidth, drawHeight];
}

//input type="file"の内容をCanvasの内容で更新する関数(これ以外の方法は無さそう)
function updateInputFileFromCanvas(resultCanvas) {
	resultCanvas.toBlob(blob => {//blobはBinary Large Object
		const file = new File([blob], "cropped.png", { type: "image/png" });
		const dataTransfer = new DataTransfer();//標準APIのDataTransferオブジェクトを作成し、ファイルを一時的に格納できる箱を用意。
		dataTransfer.items.add(file);
		inputElemt = document.getElementById('input-img-import');
		inputElemt.files = dataTransfer.files;//input要素のfilesプロパティにDataTransferオブジェクトのfilesプロパティを代入することで、input要素の選択されたファイルを更新できる
	});
}


//カラーピッカー処理
const colorpicker = document.getElementById('colorpicker');
const textInputsArray = document.querySelectorAll('input[type="text"]');

// カラーピッカーの値が変わったら文字色を更新
colorpicker.addEventListener('input', () => {

	textInputsArray.forEach(input => {
		input.style.color = colorpicker.value;
		input.style.webkitTextFillColor = colorpicker.value;
	});

	inputFreeComment.style.color = colorpicker.value;
	inputFreeComment.style.webkitTextFillColor = colorpicker.value;
});


//フォント変更処理
const selector = document.getElementById('fontselector');
let fontName;
selector.addEventListener('change', function () {
	fontName = this.value;

	const style = document.createElement('style');
	style.innerHTML = `
  input::placeholder,textarea::placeholder,input[type="text"],textarea {
    font-family: ${fontName} !important;
  }
`;
	document.head.appendChild(style);
});


//Canvasの初期画像処理
const baseImg = new Image();
//Image オブジェクトに画像URLを設定すると、ブラウザはその画像ファイルのダウンロードを開始
baseImg.src = imgSrc;
baseImg.crossOrigin = 'anonymous'; // クロスオリジン回避(CORS)

//画像の読み込みが完了したときに発生するイベントハンドラ
baseImg.onload = () => {
	canvas.width = baseImg.width;
	canvas.height = baseImg.height;
};


// 画像生成ボタンが押された時の処理
generateBtn.addEventListener('click', () => {
	//プロフィール画像処理
	const file = inputImg.files[0];

	// 画像を取り込んでいない場合処理終了
	if (!file) {
		alert('画像を選択してください。');
		return;
	}

	const text = inputText.value.trim();
	const textAge = inputAge.value.trim();
	const textGender = inputGender.value.trim();
	const textLocation = inputLocation.value.trim();
	const textGeneration = inputGeneration.value.trim();
	const textMaxPower = inputMaxPower.value.trim();
	const textLauncher = inputLauncher.value.trim();
	const textTournament = inputTournament.value.trim();
	const textFreeComment = inputFreeComment.value.split('\n'); // 改行で分割して配列にする;

	generateBtn.style.display = 'none';
	reEditBtn.style.display = 'block';

	//Canvasに画像を描画
	ctx.drawImage(baseImg, 0, 0);


	// 文字スタイル設定
	ctx.font = `bold 40px ${fontName}`;
	if (mediaQuerySp.matches) {
		ctx.font = `bold 50px ${fontName}`;
	}
	ctx.fillStyle = colorpicker.value;
	ctx.textAlign = 'start';//文字の位置は下記の数値が文字列のどこに位置するか

	// 真ん中に記入する場合ctx.fillText(text, canvas.width / 2, canvas.height / 2);
	// ctx.fillText(text, 10, 100);
	ctx.fillText(text, canvas.width * 0.06, canvas.height * 0.15);
	ctx.fillText(textLocation, canvas.width * 0.06, canvas.height * 0.25);
	ctx.fillText(textAge, canvas.width * 0.07, canvas.height * 0.41);
	ctx.fillText(textGender, canvas.width * 0.37, canvas.height * 0.41);
	ctx.fillText(textMaxPower, canvas.width * 0.67, canvas.height * 0.41);

	ctx.fillText(textGeneration, canvas.width * 0.06, canvas.height * 0.54);

	ctx.fillText(textLauncher, canvas.width * 0.06, canvas.height * 0.7);
	ctx.fillText(textTournament, canvas.width * 0.52, canvas.height * 0.7);

	//フリーコメントは1行ごとに場所を指定する
	textFreeComment.forEach((line, index) => {
		if (mediaQuerySp.matches) {
			ctx.fillText(line, canvas.width * 0.06, canvas.height * 0.038 * index + canvas.height * 0.8);
		} else {
			ctx.fillText(line, canvas.width * 0.06, canvas.height * 0.025 * index + canvas.height * 0.8); // 左寄せ10px、縦位置調整
		}
	});

	//Canvasで文字を表示するので、input要素を非表示にする
	textInputsArray.forEach(input => {
		input.style.display = 'none';
	});

	// アイコン画像選択ボタンを非表示にする
	imgInputLabel.style.display = 'none';

	inputFreeComment.style.display = 'none';

	// FileReaderでローカル画像を読み込む
	const reader = new FileReader();

	//読み込み開始、読み込み完了後にreader.onloadイベントが発火し、e.target.resultにBase64形式のデータURLが格納
	reader.readAsDataURL(file);

	reader.onload = function (e) {
		// ローカル画像を読み込んで重ねる
		const overlayImg = new Image();
		overlayImg.src = e.target.result;

		overlayImg.onload = function () {
			// サイズ調整したい場合はdrawImageの引数で変更可
			ctx.drawImage(overlayImg, canvas.width * 0.618333, canvas.height * 0.09, canvas.width * 0.333, canvas.height * 0.25);

			// Canvas画像表示
			//canvas要素に描画された内容を「PNG形式のBase64データURL」に変換 画像のホスト側がCORS許可ヘッダー出していないと処理が動かない
			const canvas_data_url = canvas.toDataURL('image/png');

			//imgタグのsrcをcanvasで生成したものに変更する
			resultImg.src = canvas_data_url;

			// ダウンロードリンク設定
			downloadLink.href = canvas_data_url;
			downloadBtn.style.display = 'inline';
		};
	};
});


// 再編集ボタンが押されたら実行
const reEditBtn = document.getElementById('re-edit-button');

reEditBtn.addEventListener('click', () => {

	generateBtn.style.display = 'block';
	reEditBtn.style.display = 'none';
	inputFreeComment.style.display = 'inline';
	imgInputLabel.style.display = 'inline-block';
	downloadBtn.style.display = 'none';

	textInputsArray.forEach(input => {
		input.style.display = 'inline';

		//inputを再表示させたことによってブラウザ履歴（オートフィル）で入力された部分の背景画像が透明にならないのを解消する
		const val = input.value;
		input.value = "";
		input.value = val;
	});

	// ctx.fillTextの内容を消す
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//画像をcanvasから背景画像に戻す
	resultImg.src = imgSrc;

});



