var current_blockchain = 'doget';
var private_key = 'cmEZ1Y4DogQfubCFDQvahz4g5LB7kf9FgdjJw9ywjypd4GLwMh9A';
var public_key = 'njV9KyXAUJLB6gexQuZz9qPy4qprronsAS';

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
                url: 'http://nu-bank.herokuapp.com/data/source',
                dataType: 'json',
                complete: function(results)
                {
                    if(typeof results.responseJSON != 'undefined')
                    {
                        nu_bank.process(results.responseJSON);
                    }
                    else
                    {
                        nu_bank.poll();
                    }
                }
            });
        }, timeout);
    },
    process: function(the_results)
    {
        if($.isArray(the_results))
        {
            var tx_results = [];
            var all_unspents = false;
            var tx_count = blockstrap_functions.array_length(the_results);
            $.each(the_results, function(k, obj)
            {
                //var obj = the_results[index];
                //index++;
                if(
                    typeof obj.id != 'undefined'
                    && typeof obj.receiver_id != 'undefined'
                    && typeof obj.sender_id != 'undefined'
                    && typeof obj.hub_id != 'undefined'
                    && typeof obj.amount != 'undefined'
                    && typeof obj.created_at != 'undefined'
                    && typeof obj.updated_at != 'undefined'
                    && typeof obj.is_pushed != 'undefined'
                    && obj.is_pushed === false
                ){
                    var created = new Date().getTime(obj.created_at);
                    var updated = new Date().getTime(obj.updated_at);
                    var transfer_data = obj.id + '|' + obj.receiver_id + '|' + obj.sender_id + '|' + obj.hub_id + '|' + obj.amount + '|' + created + '|' + updated;
                    $.fn.blockstrap.api.unspents(public_key, current_blockchain, function(unspents)
                    {
                        if(!all_unspents) all_unspents = unspents;
                        if($.isArray(all_unspents) && blockstrap_functions.array_length(all_unspents) > 0)
                        {
                            var total = 0; 
                            var inputs = [];
                            var fee = $.fn.blockstrap.settings.blockchains[current_blockchain].fee * 100000000;
                            $.each(all_unspents, function(k, unspent)
                            {
                                if(total <= fee * 2)
                                {
                                    inputs.push({
                                        txid: unspent.txid,
                                        n: unspent.index,
                                        script: unspent.script,
                                        value: unspent.value,
                                    });
                                    total = total + unspent.value;
                                    all_unspents.splice(k, 1)
                                }
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
                                tx_results.push({
                                    res: results,
                                    id: obj.id
                                });
                                if(k + 1 >= tx_count)
                                {
                                    nu_bank.processed(tx_results);
                                }
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
                    $.fn.blockstrap.core.modal('Error', 'Missing required information');
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
        var confirmation = '';
        if($.isArray(txs))
        {
            $.each(txs, function(k, tx)
            {
                if(
                    typeof tx.res != 'undefined' 
                    && typeof tx.res.txid != 'undefined' 
                    && tx.res.txid
                ){
                    var txid = tx.res.txid;
                    var url = 'http://api.blockstrap.com/v0/'+current_blockchain+'/transaction/id/'+txid+'?showtxnio=1';
                    confirmation+= '<p>TX <a href="'+url+'">'+txid+'</a></p>';
                }
            });
        }
        $.ajax({
            url: 'http://nu-bank.herokuapp.com/data/sink',
            data: {txs: txs},
            dataType: 'json',
            method: 'post',
            complete: function(results)
            {
                $.fn.blockstrap.core.modal('Success', confirmation);
            }
        });
    }
};

$(document).ready(function()
{
    nu_bank.init();
});

