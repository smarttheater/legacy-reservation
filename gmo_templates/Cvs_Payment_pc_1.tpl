<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

	<meta http-equiv="Content-Type" content="text/html; charset=shift_jis" />
	<meta http-equiv="Content-style-Type" content="text/html; charset=Shift_JIS" />
	<title>コンビニ決済入力テンプレートサンプル　ＰＧマルチペイメントサービス</title>
	
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
					<span>ショッピングサイトに戻る Return to the online ticket website &lt;</span>
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
				<span>お支払方法のご案内</span>
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
							<span class="p">コンビニエンスストア決済の必要事項をご記入ください。</span>
						</h2>
					</div>
				</div>
				
				<div class="bl_body">
					
					<table class="generic" summary="credit_1" id="credit">
						<tr>
							<th>ご利用するコンビニの選択<br />Select convenience store</th>
							<td>{insert name="select_cvsCorpList"}</td>
						</tr>
						<tr>
							<th>氏名<br />Name</th>
							<td>
								<input type="text" name="CustomerName" size='24' maxlength="20" value="{$CustomerName|htmlspecialchars}" />
								<p class="note">全角でご記入ください</p>
							</td>
						</tr>
						<tr>
							<th>フリガナ<br />Furigana</th>
							<td>
								<input type="text" name="CustomerKana" size='24' maxlength="20" value="{$CustomerKana|htmlspecialchars}" />
								<p class="note">全角でご記入ください</p>
							</td>
						</tr>
						<tr>
							<th>電話番号<br />Telephone number</th>
							<td>
								<input type="text" name="TelNo" size='15' maxlength="13" class="code" value="{$TelNo|htmlspecialchars}" />
							</td>
						</tr>
						<tr>
							<th>ご連絡先メールアドレス<br />Customer's email address</th>
							<td>
								<input type="text" name="MailAddress" size='24' maxlength="256" value="{$MailAddress|htmlspecialchars}" />
							</td>
						</tr>
					</table>
					<p class="control">
						<span class="submit">
							{if $Confirm eq "1"}
							<input type="submit" value="確認する Confirm" />
							{else}
							<input type="submit" value="決済する Pay" />
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
								<th>予約番号<br />Reservation number</th>
								<td>{$ReserveNo|htmlspecialchars}</td>
							</tr>
							<tr>
								<th>会員番号<br />Membership number</th>
								<td>{$MemberNo|htmlspecialchars}</td>
							</tr>
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