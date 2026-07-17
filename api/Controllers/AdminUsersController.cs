using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Admin;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Admin User Management — who may sign in to the Admin Portal at all, and
/// with which role. SuperAdmin-only across every action, including GET:
/// an ordinary Admin has no visibility into the admin roster, per the
/// spec's role table. Identified by email in the route (not a separate
/// Firestore-generated id) since email is the actual Firestore document
/// key (see AdminUserRepository) — there's no secondary lookup-by-id path.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin-users")]
[Authorize(Roles = AdminRoles.SuperAdmin)]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _service;

    public AdminUsersController(IAdminUserService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<AdminUserResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AdminUserResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(AdminUserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminUserResponse>> Create([FromBody] CreateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var createdBy = User.FindFirstEmail();
        var response = await _service.CreateAsync(request, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { version = "1.0" }, response);
    }

    [HttpPut("{email}")]
    [ProducesResponseType(typeof(AdminUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminUserResponse>> Update(string email, [FromBody] UpdateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var callerEmail = User.FindFirstEmail();
        return Ok(await _service.UpdateAsync(email, request, callerEmail, cancellationToken));
    }

    [HttpPatch("{email}/activate")]
    [ProducesResponseType(typeof(AdminUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserResponse>> Activate(string email, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.SetActiveAsync(email, true, updatedBy, cancellationToken));
    }

    [HttpPatch("{email}/deactivate")]
    [ProducesResponseType(typeof(AdminUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminUserResponse>> Deactivate(string email, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.SetActiveAsync(email, false, updatedBy, cancellationToken));
    }
}
