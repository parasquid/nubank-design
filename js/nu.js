var current_blockchain = 'doget';
var private_key = 'cjCmuzx1T4YK2cciUzzJyx2qtAcKPyj4b5YwW4YtndyzgMgiV6rJ';
var public_key = 'nZvwQw2wi4819zWVppN8AKHNovMPHjoDy8';

var nu_bank = 
{
    buttons: function()
    {
        $('.modal-trigger').on('click', function(e)
        {
            e.preventDefault();
            var button = this;
            var id = $(button).attr('data-id');
            var form = $('div#'+id).html();
            var title = $(button).text();
            $.fn.blockstrap.core.modal(title, form);
            $('#default-modal').find('form').attr('id', id);
        });
    },
    init: function()
    {
        var bs = $.fn.blockstrap;
        nu_bank.poll(1);
        nu_bank.buttons();
    },
    poll: function(timeout)
    {
        if(typeof timeout == 'undefined')
        {
            timeout = 30000;
        }
        setTimeout(function () 
        {
            $.ajax({
                url: 'events.json',
                data: {},
                dataType: 'json',
                method: 'post',
                complete: function(results)
                {
                    nu_bank.process(results);
                }
            });
        }, timeout);
    },
    process: function(results)
    {
        console.log('process results', results);
        var from = '';
        var to = '';
        var hub = '';
        var ts = '';
        var amount = '';
        var transfer_data = '';
        if(typeof results.success != 'undefined' && results.success === true)
        {
            $.fn.blockstrap.api.unspents(public_key, current_blockchain, function(unspents)
            {
                if($.isArray(unspents) && blockstrap_functions.array_length(unspents) > 0)
                {
                    var total = 0; 
                    var inputs = [];
                    var fee = $.fn.blockstrap.settings.blockchains[current_blockchain].fee;
                    $.each(unspents, function(k, unspent)
                    {
                        inputs.push({
                            txid: unspent.txid,
                            n: unspent.index,
                            script: unspent.script,
                            value: unspent.value,
                        });
                        total = total + unspent.value
                    });
                    var outputs = [{
                        address: public_key,
                        value: total - fee
                    }];
                    var raw_tx = $.fn.blockstrap.blockchains.raw(
                        public_key,
                        private_key,
                        inputs,
                        outputs,
                        fee,
                        total - fee,
                        transfer_data
                    );
                    $.fn.blockstrap.api.relay(raw_tx, current_blockchain, function(results)
                    {
                        // Your callback, results should be a TXID (if successful)
                        console.log('relay results', results);
                        nu_bank.poll(10000);
                    });
                }
                else
                {
                    $.fn.blockstrap.core.modal('Error', 'No available unspents');
                }
            });
        }
        else
        {
            nu_bank.poll(10000);
        }
    },
    processed: function(txs)
    {
        $.ajax({
            url: 'completed.json',
            data: {txs},
            dataType: 'json',
            method: 'post',
            complete: function(results)
            {
                $.fn.blockstrap.core.modal('Success', 'Compeleted...?');
            }
        });
    }
};

$(document).ready(function()
{
    nu_bank.init();
});

