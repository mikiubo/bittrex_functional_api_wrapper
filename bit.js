const _ = require("ramda");
const l = require("./util_lib.js");
const hmac_sha512 = require('./hmac-sha512.js');

const options = {
  apikey : "API_KEY",
  apisecret : "API_SECRET", 
  base_url: "https://bittrex.com/api/v1.1/",
};

const nonce = function() {
  return Math.floor(new Date().getTime() / 1000);
};
//console.log(nonce());

const get_protocol_from_url = _.compose( _.head, _.split( ':') );
//console.log(protocol('http://www.google.it'));

const get_hostname_from_url = _.compose(_.head,_.split('/'),_.last,_.split('//'));
//console.log(hostname('http://www.google.it/ciao?/fdfghekr/(9'));

const option_url_format = _.curry( (par,val)=>{ return par+"="+val } );

const options_url_format = function(dt){
  if (_.isNil(dt)) return '';
  const get_option_str = function(obj){ return ''+obj.par+'='+obj.val };
  return _.join('&',_.map(get_option_str,dt));
}
//console.log(options_url_format_from_obj([{par:"a",val:1},{par:"b",val:2}]));


const bittrex_url = _.curry(function( base_url, method, action, options_str ){
  return base_url + method + '/' + action + '?' + options_str;
});

const public_bittrex_url = bittrex_url( options.base_url, 'public' );
//console.log(public_bittrex_url("ciao","ciao"));

const private_bittrex_url = _.curry(function( api_key, get_nonce, base_url, method, action, options_str ){
  return base_url + method + '/' + action + '?' + options_str +(options_str?'&':'')+ 'apikey='+api_key+'&nonce='+get_nonce();
});

const my_private_bittrex_url = private_bittrex_url( options.apikey, nonce, options.base_url);
//console.log(my_private_bittrex_url('account', 'getbalances',''));

const bittrex_apisign = _.curry( function( key, val ){
  return hmac_sha512.HmacSHA512(val, key).toString();
});

const my_bittrex_apisign = bittrex_apisign( options.apisecret );

const url_public_options = function(url){
  return {
    hostname: get_hostname_from_url( url ),
    path: _.last(_.split( get_hostname_from_url(url), url )),
    method: 'GET'
  };
};

const url_private_options = function(url){
  return {
    hostname: get_hostname_from_url( url ),
    path: _.last(_.split( get_hostname_from_url(url), url )),
    method: 'GET',
    headers: { 'apisign': my_bittrex_apisign( url ) }
  };
};


const https_task = l.https_req_task;

const public_get_task = _.curry(_.compose( _.map(JSON.parse), https_task, url_public_options, public_bittrex_url));

const private_get_task = _.curry(_.compose( _.map(JSON.parse), https_task, url_private_options, my_private_bittrex_url));

const public = public_get_task;

const market = private_get_task('market');

const account = private_get_task('account');


//export

const get_markets = public('getmarkets','');
//get_markets.fork(console.log,console.log);

const get_currencies = public('getcurrencies','');
//get_currencies.fork(console.log,console.log);

const get_ticker = _.compose( public('getticker'), option_url_format('market') );
//get_ticker('BTC-LTC').fork(console.log,console.log);
//get_ticker('').fork(console.log,console.log);

const get_market_summarys = public( 'getmarketsummarys','' );

const get_market_summary = _.compose( public( 'getmarketsummary' ) , option_url_format('market') );
//get_market_summary('BTC-LTC').fork(console.log,console.log);
//get_market_summary('').fork(console.log,console.log);

const get_orderbook = public('getorderbook','');

const get_market_history = _.curry(function(market,count){
  return public( 'getmarkethistory', options_url_format([{par:'market',val:market},{par:'count',val:count}]) );
});
//get_market_history('BTC-LTC',3).fork(console.log,console.log);

const buy_limit = _.curry( function(market,quantity,rate){
  return market('buylimit', options_url_format([
    {par:'market',val:market},
    {par:'quantity',val:quantity},
    {par:'rate',val:rate}]) );
});

const buy_market = _.curry( function(market,quantity){
  return market('buymarket', options_url_format([
    {par:'market',val:market},
    {par:'quantity',val:quantity}]));
});

const sell_limit = _.curry( function(market,quantity,rate){
  return market('selllimit', options_url_format([
    {par:'market',val:market},
    {par:'quantity',val:quantity},
    {par:'rate',val:rate}]) );
});

const sell_market = _.curry( function(market,quantity){
  return market('sellmarket', options_url_format([
    {par:'market',val:market},
    {par:'quantity',val:quantity}]));
});


const cancel = _.compose(market('cancel'),option_url_format('uuid'));

const get_openorders = _.compose( market('getopenorders'), option_url_format('market'));
//get_openorders('BTC-LTC').fork(console.log,console.log);

const get_balances = account ( 'getbalances','');
//get_balances.fork(console.log,console.log);

const get_balance = _.compose( account('getbalance'), option_url_format('currency'));
//get_balance('LTC').fork(console.log,console.log);
//get_balance('').fork(console.log,console.log);

const get_deposit_address = _.compose( account( 'getdepositaddress'), option_url_format('currency'));

const withdraw = _.curry(function(currency, quantity, address, paymentid){
  return account('withdraw', options_url_format([
    { par:'currency', val:currency },
    { par:'quantity', val:quantity },
    { par:'address', val:address },
    { par:'paymentid', val:paymentid }
  ]));
});

const get_order = _.compose(account('getorder'),option_url_format('uuid'));

const get_orderhistory = _.curry(function(market,count){
  return account('getorderhistory', options_url_format([
    { par:'market', val:market },
    { par:'count', val:count }
  ]));
});

const get_withdrawal_history = _.curry(function(currency,count){
  return account('getwithdrawalhistory', options_url_format([
    { par:'currency', val:currency },
    { par:'count', val:count }
  ]));
});

const get_deposit_history = _.curry(function(currency,count){
  return account('getdeposithistory', options_url_format([
    { par:'currency', val:currency },
    { par:'count', val:count }
  ]));
});

module.export={
 get_markets: get_markets,
 get_currencies: get_currencies,
 get_ticker: get_ticker,
 get_market_summarys: get_market_summarys,
 get_market_summary: get_market_summary,
 get_orderbook: get_orderbook,
 get_market_history: get_market_history,
 buy_limit: buy_limit,
 buy_market: buy_market,
 sell_limit: sell_limit,
 sell_market: sell_market,
 cancel: cancel,
 get_openorders: get_openorders,
 get_balances: get_balances,
 get_balance: get_balance,
 get_deposit_address: get_deposit_address,
 withdraw: withdraw,
 get_order: get_order,
 get_orderbook: get_orderbook,
 get_orderhistory: get_orderhistory,
 get_withdrawal_history: get_withdrawal_history,
 get_deposit_history: get_deposit_history
}
