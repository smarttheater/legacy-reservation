<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

	<meta http-equiv="Content-Type" content="text/html; charset=shift_jis" />
	<meta http-equiv="Content-style-Type" content="text/html; charset=Shift_JIS" />
	<title>クレジット決済レシートテンプレートサンプル　ＰＧマルチペイメントサービス</title>
	
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
				<span>お支払手続き完了</span>
			</li>
		</ul>
	</div>
	
	<div class="main">
	
		<form action="{$RetURL|htmlspecialchars}" method="post" onsubmit="return blockForm()">
		
			<p>{insert name="input_returnParams"}</p>
			
			<p class="txt">決済が完了しました。次へお進みください。</p>
		
			<div class="block">
				<div class="bl_title">
					<div class="bl_title_inner">
						<h2>
							<span class="p">ご利用内容</span>
						</h2>
					</div>
				</div>
				
				<div class="bl_body">
		
					<table class="generic">
					{if $JobCd != "CHECK" }
					  <tr>
					    <th>金額<br />Amount</th>
					    <td >{$Amount|number_format|htmlspecialchars}円</td>
					  </tr>
					  {/if}
					  <tr>
					    <th>支払方法<br />Type of payment</th>
					    <td >
					    	{$MethodName|htmlspecialchars}
							  {if $Method eq "2"}
						   	 /{$PayTimes|htmlspecialchars}回
						   	 {/if}
					   	 </td>
					  </tr>
					  <tr>
					    <th>カード番号<br />Amount</th>
					    <td >{$CardNo|htmlspecialchars}</td>
					  </tr>
					  <tr>
					    <th>有効期限(MM/YY)<br />Expiration date (MM/YY)</th>
					    <td >{$ExpireMonth|htmlspecialchars}/{$ExpireYear|htmlspecialchars}</td>
					  </tr>
					</table>
					
					<p class="control">
						<span class="submit">
							<input type="submit" value="進む" />
						</span>
					</p>
					<br class="clear" />	
				</div>
				
			</div>
		</form>
	</div>
		
</div>
</div>
{* デバッグが必要な場合、以下の行の * を削除して、コメントを外してください。 *}
{*insert name="debug_showAllVars"*}
</body>
</html>