<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

	<meta http-equiv="Content-Type" content="text/html; charset=shift_jis" />
	<meta http-equiv="Content-style-Type" content="text/html; charset=Shift_JIS" />
	<title>クレジット決済入力テンプレートサンプル　ＰＧマルチペイメントサービス</title>
	
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
			<li class="active">
				<a href="{$CancelURL|htmlspecialchars}">
					<span>ショッピングサイトに戻る &lt;</span>
				</a>
			</li>
			{if $SelectURL ne null}
			<li  class="active">
				<a href="{$SelectURL|htmlspecialchars}">
					<span>お支払方法の選択 &gt;</span>
				</a>
			</li>
			{/if}
			<li  class="current">
				<span>必要事項を記入 &gt;</span>
			</li>
			{if $Confirm eq '1'}
			<li>
				<span>確認して手続き &gt;</span>
			</li>
			{/if}
			<li>
				<span>お支払手続き完了</span>
			</li>
		</ul>
	</div>
	
	<div class="main">

		{if  $CheckMessageArray neq null }
		<div id="GP_msg">
			<ul>
			{foreach item=message from=$CheckMessageArray}
				<li>{$message}</li>
			{/foreach}
			</ul>
		</div>
		{/if}
	
		<form action="{$ExecURL|htmlspecialchars}" onsubmit="return blockForm()" method="post">
		
			<p>{insert name="input_keyItems"}</p>
			
			<div class="block">
				<div class="bl_title">
					<div class="bl_title_inner">
						<h2>
							<span class="p">クレジットカード決済の必要事項をご記入ください。</span>
						</h2>
					</div>
				</div>
				
				<div class="bl_body">
					
					<table class="generic" summary="credit_1" id="credit">
						<tr>
							<th>お支払い方法<br />Total payment</th>
							<td>
								{insert name="select_payMethodList"}
							</td>
						</tr>
						<tr>
							<th>
								分割回数<br /><span class="note">お支払い方法が分割の場合、必ず選択してください。</span><br />
								Number of installments<br /><span class="note">Be sure to select one to make an installment payment. </span>
							</th>
							<td>
								{insert name="select_payTimesList"}
							</td>
						</tr>
						{if $MemberCardArray ne null}
							<tr>
								<th class="td_bl2">
									カードの指定方法を選択してください。
								</th>
								<td>
									{insert name="radio_paymentMode"}
								</td>
							</tr>
							<tr>
								<th class="inner_label" colspan="2">
									カード番号を入力して決済する場合、以下の内容を入力してください。
								</th>
							</tr>
						{/if}
						<tr>
							<th>
								カード番号<br /><span class="note">ハイフン’-’無しで、数字のみご記入ください。</span><br />
								Card number<br /><span class="note">Only enter numerals. Do not enter hyphens.</span>
							</th>
							<td><input name="CardNo" type="text" id="Name" value="{$CardNo|htmlspecialchars}" class="code" maxlength="16" size="20"/></td>
						</tr>
						<tr>
							<th>カード有効期限<br />Expiration date</th>
						<td>
							{insert name="select_expireList"}
						</td>
					</tr>
					<tr>
						<th>セキュリティコード<br />Security code</th>
						<td><input name="SecurityCode" type="text" id="SecurityCode" value="{$SecurityCode|htmlspecialchars}" class="code" maxlength="4" size="6" /></td>
					</tr>
					{if $MemberCardArray ne null}
						<tr>
							<th class="inner_label" colspan="2">
								登録カードで決済する場合、以下の内容を入力してください。
							</th>
						</tr>
						<tr>
							<th class="td_bl2">ご利用になるカードを選択してください。</th>
							<td>{insert name="select_memberCardList"}</td>
						</tr>
						<tr>
							<th class="td_bl2">カードに設定したパスワードをご記入ください。
								<p class="GPNotion">設定していない場合、空欄にしてください。</p>
							</th>
							<td id="card_pass_input">
							<input type="password" name="CardPass" size="20" maxlength="20" /><br />
							確認用に再度入力：<input type="password" name="CardPassConf" size="20" maxlength="20" />
							</td>
						</tr>
					{/if}
					</table>
					<p class="control">
						<span class="submit">
							{if $Confirm eq "1"}
							<input type="submit" value="確認する" />
							{else}
							<input type="submit" value="決済する" />
							{/if}
						</span>
					</p>
				</div>
			</div>

			<div class="block">
				<div class="bl_title">
					<div class="bl_title_inner">
						<h2>
							<span class="p">ご利用内容</span>
						</h2>
					</div>
				</div>
				
				<div class="bl_body">
		
					<div>
						<table id="cartinfo" class="generic">
							<tr>
								<th>お品代<br />Ticket price</th>
								<td>{$Amount|number_format|htmlspecialchars}円</td>
							</tr>
							<tr>
								<th>税送料<br />Tax and postage</th>
								<td>{$Tax|number_format|htmlspecialchars}円</td>
							</tr>
							<tr>
								<th>お支払合計<br />Total payment</th>
								<td>{$Total|number_format|htmlspecialchars}円</td>
							</tr>
						</table>
					</div>
					
				</div>
				
			</div>
						
			<br class="clear" />
			
		</form>
	</div>

</div>
</div>
{* デバッグが必要な場合、以下の行の * を削除して、コメントを外してください。 *}
{*insert name="debug_showAllVars"*}
</body>
</html>