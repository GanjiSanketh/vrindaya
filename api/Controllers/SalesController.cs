using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/sales")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class SalesController : ControllerBase
{
    private readonly ISaleService _saleService;

    public SalesController(ISaleService saleService)
    {
        _saleService = saleService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SaleDto>>> GetAll(CancellationToken cancellationToken)
    {
        var sales = await _saleService.GetAllAsync(cancellationToken);
        return Ok(sales);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SaleDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetByIdAsync(id, cancellationToken);
        if (sale == null) return NotFound();
        return Ok(sale);
    }

    [HttpPost]
    public async Task<ActionResult<SaleDto>> Create([FromBody] CreateSaleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var sale = await _saleService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = sale.Id }, sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SaleDto>> Update(string id, [FromBody] CreateSaleRequest request, CancellationToken cancellationToken)
    {
        var sale = await _saleService.UpdateAsync(id, request, cancellationToken);
        if (sale == null) return NotFound();
        return Ok(sale);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _saleService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
