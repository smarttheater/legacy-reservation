<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

	<meta http-equiv="Content-Type" content="text/html; charset=shift_jis" />
	<meta http-equiv="Content-style-Type" content="text/html; charset=Shift_JIS" />
	<title>クレジット決済確認テンプレートサンプル　ＰＧマルチペイメントサービス</title>
	
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
			<li  class="active">
				<a href="{$EntryURL|htmlspecialchars}">
				<span>必要事項を記入 &gt;</span>
				</a>
			</li>
			<li class="current">
				<span>確認して手続き &gt;</span>
			</li>
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
							<span class="p">下記の内容で決済します。よろしければ、「決済する」ボタンを押してください。</span>
						</h2>
					</div>
				</div>
				
				<div class="bl_body">
					
					<table class="generic" summary="credit_1" id="credit">
						<tr>
							<th class="td_bl2">支払方法</th>
							<td>{$MethodName|htmlspecialchars}</td>
						</tr>
						<tr>
							<th class="td_bl2">分割回数</th>
							<td>{$PayTimes|htmlspecialchars}</td>
						</tr>
						<tr>
							<th class="td_bl2">カード番号</th>
							<td>{$CardNo|htmlspecialchars}</td>
						</tr>
						<tr>
							<th class="td_bl2">カード有効期限(MM/YY)</th>
							<td>{$ExpireMonth|htmlspecialchars}/{$ExpireYear|htmlspecialchars}</td>
						</tr>
					
					</table>
					
					<p class="control">
						<span class="submit">
							<input type="submit" value="決済する" />
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
								<th>お品代</th>
								<td>{$Amount|number_format|htmlspecialchars}円</td>
							</tr>
							<tr>
								<th>税送料</th>
								<td>{$Tax|number_format|htmlspecialchars}円</td>
							</tr>
							<tr>
								<th>お支払合計</th>
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
{* デバッグが必要な場合、以下の行の * を削除して、コメントを外してください。 *}
{*insert name="debug_showAllVars"*}
</body>
</html>