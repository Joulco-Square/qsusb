var $qs_err_func;
var $xhr,$call_back;	
var $ajax_busy=0;		

function qs_init()
{
	if(!$xhr) 
	{
		try 
		{
			$xhr = new XMLHttpRequest();
		} catch(e){
			alert("Your Browser does not support Ajax");
			return;
		}
	}
	$xhr.onreadystatechange = qs_rx;
}	
		
//------------------------------
function qs_tx($cmd,callback)
{

	if($ajax_busy==1)return 0;
	$ajax_busy=1;
	$call_back = callback;

	$xhr.open("GET",$cmd,true);//async
	$xhr.send(null);
	return 1;//ajax is sent wait for reply

}
//----------------
function qs_rx()
{

	if($xhr.readyState!=4)return;
	if(!$xhr.status){
		$ajax_busy=0;
		srv_err();
		return;
	}
	srv_ok();
	$ajax_busy=0;

	var s = $xhr.responseText;
	if(s=="")return;
								
	var j = eval('(' + s + ')');
	if(j==null)return;
	if($call_back)$call_back(j);	
}
//---------------------
function qs_tx_sync($cmd)
{
	xhr = new XMLHttpRequest();
	
	if (xhr == null)return null;
	try {
		xhr.onreadystatechange = null;
		xhr.open('GET', $cmd, false);
		xhr.send(null);
	}
	catch (err)
	{
		if($qs_err_func)$qs_err_func('ERROR: QSUSB Server not running');
		return null;
	}
	if (xhr.status != 200)return null;
	return xhr.responseText;
}

function qs_post_sync(url,data)
{
	xhr = new XMLHttpRequest();
	
	if (xhr == null)return null;
	try {
		xhr.onreadystatechange = null;
		xhr.open('POST',url, false);
		xhr.send(data);
	}
	catch (err)
	{
		alert('QSUSB Server not running');
		return null;
	}
	if (xhr.status != 200)return null;
	return true;
}
//**********************************************************************	
function dechex(d) 
{
	var hex = d.toString(16);
	if(hex.length%2)hex = '0'+ hex;
	return hex;
}
function hexdec(h) {
	return parseInt(h,16);
}
//-------------
function obj_save(f,obj)
{
	var data = JSON.stringify(obj);
	var url = '/&save/' + f;
	var r = qs_post_sync(url,data);
	return r;
}
//--------
function obj_load(f)
{
	var c = '/&get/'+f;
	var o = qs_tx_sync(c);
	if (o == null)return null;
	return eval('(' + o + ')');
}

function rssi_conv(s)
{
	var l = 0;
	i = hexdec(s);
		
    if(i>=128)l = ((i-256)/2)-74;
    else l= (i/2)-74;

    i=120+l;
    if(i>100)i=100;
    return i+'%' + ' (' + l + 'dbm)' ;
}
function isID(id) 
{
	var strPattern = /^@[0-9a-f]{6}$/i ;
	return strPattern.test(id);
} 
function ask_id(q)
{
	if(q)var id = prompt(q,"");
	else var id = prompt("Enter the Device ID (@xxxxxx)","");
	if(!id)return;
	
	if(id.charAt(0)!='@'){
		if(id.length!=6)return;
		id = '@' + id;
	}
	
	if(id.length!=7)return;	
	if(isID(id));
	else return;
	
	return id;	
}

