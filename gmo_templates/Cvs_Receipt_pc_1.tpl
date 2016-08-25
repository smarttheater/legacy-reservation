<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

	<meta http-equiv="Content-Type" content="text/html; charset=shift_jis" />
	<meta http-equiv="Content-style-Type" content="text/html; charset=Shift_JIS" />
	<title>コンビニエンスストア決済レシートテンプレートサンプル　ＰＧマルチペイメントサービス</title>

	<link href="{$CSSPATH}/common.css" rel="stylesheet" type="text/css" />

	{literal}
	<script type="text/javascript">
		var submitted = false
		function blockForm(){
			if( submitted ){
				return false
			}
			submitted = true
			return true
		}
	</script>
	{/literal}

</head>
<body>

<div class="wrapper">
<div class="bodyinner">

	<!--ヘッダー開始-->
	<div class="header">
		<h1>{$ShopName|htmlspecialchars } お支払手続き</h1>
	</div>

	<div class="flow">
		<ul>
			<li>
				<span>ショッピングサイトに戻る &lt;</span>
			</li>
			{if $SelectURL ne null}
			<li>
				<span>お支払方法の選択 &gt;</span>
			</li>
			{/if}
			<li>
				<span>必要事項を記入 &gt;</span>
			</li>
			{if $Confirm eq "1"}
			<li>
				<span>確認して手続き &gt;</span>
			</li>
			{/if}
			<li class="current">
				<span>お支払方法のご案内</span>
			</li>
		</ul>
	</div>

	<div class="main">
		<p class="txt">コンビニエンスストアお支払い申し込みが完了しました。下記の手順でお支払いください。</p>
		<p class="txt">お支払いの際、このページに記載された番号が必要になります。メモを取るか、このページを印刷してお持ちください。</p>

		{if $CvsCode ne '00007' && $CvsCode ne '10001' && $CvsCode ne '10002' && $CvsCode ne '10005'}
		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">ローソン／ミニストップでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>お客様番号</dt>
					<dd>{$CvsReceiptNo|htmlspecialchars}</dd>
					<dt>確認番号</dt>
					<dd>{$CvsConfNo|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>Loppiのあるローソン、またはミニストップ全店でお支払いいただけます。<br />Loppiで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、お客様番号と確認番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより「各種サービスメニュー」を選択してください。</li>
								<li>上から4番目  ￥マークのボタン「各種代金・料金お支払い/～」を選択してください。</li>
								<li>続いて「各種代金お支払い」を選択してください。</li>
								<li>「各種代金お支払い」のページで「マルチペイメントサービス」を選択してください。</li>
								<li>サービス内容をご確認後、よろしければ「はい」を選択してください。</li>
								<li>お客様番号 を入力し、「次へ」を選択してください。</li>
								<li>確認番号 を入力し、「次へ」を選択してください。</li>
								<li>表示される内容を確認のうえ、「了解」を選択してください。</li>
								<li>お支払い時の注意事項をご確認後、よろしければ「はい」を選択してください。</li>
								<li>印刷された申込券をレジに渡し、30分以内に現金でお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">ファミリーマートでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>お客様番号</dt>
					<dd>{$CvsReceiptNo|htmlspecialchars}</dd>
					<dt>確認番号</dt>
					<dd>{$CvsConfNo|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>Famiポートのあるファミリーマート全店でお支払いいただけます。<br />Famiポートで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、お客様番号と確認番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより「コンビニでお支払い」を選択してください。</li>
								<li>「代金お支払い」のページで「各種番号をお持ちの方はこちら」を選択してください。</li>
								<li>お客様番号 を入力し、「OK」を選択してください。</li>
								<li>確認番号 を入力し、「OK」を選択してください。</li>
								<li>お支払い内容を確認のうえ、「確認」を選択してください。</li>
								<li>印刷された申込券をレジに渡し、30分以内に現金でお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">サークルＫサンクスでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>お客様番号</dt>
					<dd>{$CvsReceiptNo|htmlspecialchars}</dd>
					<dt>確認番号</dt>
					<dd>{$CvsConfNo|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>ＫステーションのあるサークルＫサンクス全店でお支払いいただけます。<br />Ｋステーションで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、お客様番号と確認番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより画面中央部分の「各種支払い」を選択してください。</li>
								<li>「11ケタ等の番号をお持ちの方」を選択してください。</li>
								<li>「各種代金お支払い（お支払いの選択）」のページで「マルチペイメントサービス」を選択してください。</li>
								<li>サービス受付完了までの流れを確認のうえ、「次に進む」を選択してください。</li>
								<li>お客様番号 を入力し、「次に進む」を選択してください。</li>
								<li>確認番号 を入力し、「次に進む」を選択してください。</li>
								<li>入力情報に間違いがないかを確認のうえ、「次に進む」を選択してください。</li>
								<li>お支払い内容を確認のうえ、「次に進む」を選択してください。</li>
								<li>印刷された申込券をレジに渡し、30分以内に現金でお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">セイコーマートでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>オンライン決済番号</dt>
					<dd>{$CvsReceiptNo_Format|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>クラブステーションのあるセイコーマート全店でお支払いいただけます。<br />クラブステーションで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、オンライン決済番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより左下のボタン「インターネット受付　各種代金お支払い」を選択してください。</li>
								<li>「オンライン決済番号（11桁）」のハイフンを除いて入力し、「次のページ」を選択してください。</li>
								<li>入力情報に間違いがないかを確認のうえ、「次のページ」を選択してください。</li>
								<li>お支払い内容を確認のうえ、「印刷」を選択してください。</li>
								<li>印刷された受付票をレジに渡し、30分以内に現金でお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">デイリーヤマザキ／スリーエフでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body information">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>オンライン決済番号</dt>
					<dd>{$CvsReceiptNo_Format|htmlspecialchars}</dd>
				</dl>
				<div class="information">
				お支払いの前にお読みください
					<ul>
						<li>「オンライン決済」と店員にお伝えください。
							デイリーヤマザキと同系列のヤマザキデイリーストアーでもお支払いいただけます。
							お支払い方法はデイリーヤマザキと同様です。</li>
						<li>お支払いの際、オンライン決済番号が必要です。
							メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<ol>
						<li>コンビニのレジスタッフに、上記オンライン決済番号をご提示して頂き、「オンライン決済」希望とお伝えください。</li>
						<li>スタッフがレジを操作後に、入力画面が表示されますので、お客様がオンライン決済番号をご入力ください。</li>
						<li>お支払い内容が表示されますので、内容が正しいことをご確認のうえ、「確定」を押してください。</li>
						<li>現金で商品代金をお支払いください。</li>
						<li>領収書(レシート形式)が発行されますので、必ずお受け取りください。</li>
					</ol>
				</div>
			</div>
		</div>
		{/if}

		{if $CvsCode eq '00007'}
		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">セブンイレブンでのお支払い方法</span>
					</h2>
				</div>
			</div>
			<div class="bl_body information">
				<div class="information">
					払込票番号をメモして最寄のセブンイレブンのレジにてお支払いください。
					<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
						<dt>払込票番号</dt>
						<dd>
							{$CvsReceiptNo|htmlspecialchars}
							{if $CvsReceiptUrl ne null}
							&nbsp;&nbsp;<a target="_blank" href="{$CvsReceiptUrl|htmlspecialchars}">[払込票表示]</a>
							{/if}
						</dd>
						<dt>支払期限</dt>
						<dd>
							{$PaymentTermYear|htmlspecialchars}年{$PaymentTermMonth|htmlspecialchars}月{$PaymentTermDay|htmlspecialchars}日
						</dd>
					</dl>
				</div>
			</div>
		</div>
		{/if}

		{if $CvsCode eq '10001' || $CvsCode eq '10005'}
		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">ローソン／ミニストップでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>お客様番号</dt>
					<dd>{$CvsReceiptNo|htmlspecialchars}</dd>
					<dt>確認番号</dt>
					<dd>{$CvsConfNo|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>Loppiのあるローソン、またはミニストップ全店でお支払いいただけます。<br />Loppiで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、お客様番号と確認番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより「各種番号をお持ちの方」を選択してください。</li>
								<li>お客様番号 を入力し「次へ」を選択してください。</li>
								<li>確認番号 を入力し、「次へ」を選択してください。</li>
								<li>表示される内容を確認のうえ、「はい」を選択してください。</li>
								<li>印刷された申込券をレジに渡し、30分以内に現金でお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>
		{/if}

		{if $CvsCode eq '10002'}
		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">ファミリーマートでお支払いの場合</span>
					</h2>
				</div>
			</div>
			<div class="bl_body">
				<dl class="allocated_numbers warn" id="cvs_l_f_numbers">
					<dt>確認番号</dt>
					<dd>{$CvsConfNo|htmlspecialchars}</dd>
					<dt>お客様番号</dt>
					<dd>{$CvsReceiptNo|htmlspecialchars}</dd>
				</dl>
				<div class="information" id="cvs_l_f_info">
					お支払いの前にお読みください
					<ul>
						<li>Famiポートのあるファミリーマート全店でお支払いいただけます。<br />Famiポートで申込券を発行してから30分以内にレジでお支払いください。</li>
						<li>お支払いの際、お客様番号と確認番号が必要です。<br />メモを取るか、このページを印刷して、コンビニまでお持ちください。</li>
						<li>取扱明細兼受領書が領収書となりますので、お支払い後必ずお受け取りください。</li>
					</ul>
					<p class="note">
					※30万円を超えるお支払いはできません。<br />
					※コンビニ店頭でのお支払いには楽天Edyはご利用いただけません。現金でお支払いください。
					</p>
					<dl>
						<dd>
							<ol>
								<li>トップページより「代金支払い（コンビニでお支払い）」を選択してください。</li>
								<li>「代金お支払い」のページで「各種番号をお持ちの方はこちら」を選択してください。</li>
								<li>「番号入力画面に進む」を選択してください。</li>
								<li>確認番号(5桁) を入力し、「OK」を選択してください。</li>
								<li>お客様番号(12桁) を入力し、「OK」を選択してください。</li>
								<li>お支払い内容を確認のうえ、「確認」を選択してください。</li>
								<li>印刷された申込券をレジに渡し、30分以内にお支払いください。</li>
								<li>お支払い後、「取扱明細兼受領書」を必ずお受け取りください。</li>
							</ol>
						</dd>
					</dl>
				</div>
			</div>
		</div>
		{/if}

		<div class="block">
			<div class="bl_title">
				<div class="bl_title_inner">
					<h2>
						<span class="p">ショッピングサイトに戻る</span>
					</h2>
				</div>
			</div>
			<div class="bl_body information">

				<p class="alert">このページは再表示できません。</p>
				<p class="txt">
					{if $CvsCode eq '00007'}
						払込票番号
					{else}
						お客様番号、確認番号、お客様決済番号
					{/if}
					のメモをお取りになるか、このページを印刷しましたか？</p>
				<form action="{$RetURL|htmlspecialchars}" method="post" onsubmit="return blockForm()">
					<p>{insert name="input_returnParams"}</p>
					<p class="control">
						<span class="submit">
							<input type="submit" value="ショッピングサイトに戻る" />
						</span>
					</p>
				</form>
				<br class="clear" />
			</div>
		</div>
	</div>

</div>
</div>
{* デバッグが必要な場合、以下の行の * を削除して、コメントを外してください。 *}
{*insert name="debug_showAllVars"*}
</body>
</html>